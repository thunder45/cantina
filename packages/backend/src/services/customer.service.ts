import { Customer, CustomerTransaction, CustomerHistory, CustomerWithBalance, CustomerHistoryFilter, PaymentMethod, PaymentPart, DEFAULT_CREDIT_LIMIT, ReceiptItem } from '@cantina-pos/shared';
import * as customerRepository from '../repositories/customer.repository';
import * as saleRepository from '../repositories/sale.repository';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as auditLogService from './audit-log.service';
import * as reconciliationService from './reconciliation.service';
import { executeTransaction, executeTransactionBatches, TransactItem } from '../repositories/dynamodb-transactions';

export async function createCustomer(name: string, creditLimit: number = DEFAULT_CREDIT_LIMIT, initialBalance: number = 0): Promise<Customer> {
  if (!name?.trim()) throw new Error('ERR_EMPTY_NAME');
  return customerRepository.createCustomer(name.trim(), creditLimit, initialBalance);
}

export async function getCustomer(id: string): Promise<Customer> {
  const customer = await customerRepository.getCustomerById(id);
  if (!customer) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  return customer;
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  return customerRepository.getCustomerById(id);
}

export async function customerExists(id: string): Promise<boolean> {
  return customerRepository.customerExists(id);
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query?.trim()) return customerRepository.getAllCustomers();
  return customerRepository.searchCustomers(query);
}

export async function getAllCustomers(): Promise<Customer[]> {
  return customerRepository.getAllCustomers();
}

export async function getCustomerBalance(customerId: string): Promise<number> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  return customerRepository.calculateBalance(customerId);
}

export async function getCustomerWithBalance(customerId: string): Promise<CustomerWithBalance> {
  const customer = await getCustomer(customerId);
  const balance = await customerRepository.calculateBalance(customerId);
  return { ...customer, balance };
}

export async function getCustomersWithBalances(): Promise<CustomerWithBalance[]> {
  const customers = await customerRepository.getAllCustomers();
  return Promise.all(customers.map(async c => ({
    ...c,
    balance: await customerRepository.calculateBalance(c.id),
  })));
}

export async function getCustomerHistory(customerId: string, filter?: CustomerHistoryFilter): Promise<CustomerHistory> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  let transactions = await customerRepository.getTransactionsByCustomer(customerId);
  
  // Enrich purchase transactions with event/category data
  const enrichedTransactions = await Promise.all(transactions.map(async (tx) => {
    if (tx.type !== 'purchase' || !tx.saleId) return tx;
    
    const sale = await saleRepository.getSaleById(tx.saleId);
    if (!sale) return tx;
    
    const event = await eventRepository.getEventById(sale.eventId);
    if (!event) return tx;
    
    const category = await eventCategoryRepository.getCategoryById(event.categoryId);
    
    const items: ReceiptItem[] = sale.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity,
    }));
    
    return {
      ...tx,
      eventId: event.id,
      eventName: event.name,
      categoryId: event.categoryId,
      categoryName: category?.name,
      items,
    };
  }));
  
  // Apply filters
  let filtered = enrichedTransactions;
  if (filter?.categoryId) {
    filtered = filtered.filter(tx => tx.categoryId === filter.categoryId);
  }
  if (filter?.startDate) {
    const start = new Date(filter.startDate);
    filtered = filtered.filter(tx => new Date(tx.createdAt) >= start);
  }
  if (filter?.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(tx => new Date(tx.createdAt) <= end);
  }
  
  const balance = await customerRepository.calculateBalance(customerId);
  return { transactions: filtered, balance };
}

// Depositar crédito na conta do cliente
export async function deposit(
  customerId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  createdBy: string,
  description?: string
): Promise<CustomerTransaction> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  if (amount === 0) throw new Error('ERR_INVALID_AMOUNT');

  // Negative deposit = withdrawal/correction
  if (amount < 0) {
    return withdraw(customerId, Math.abs(amount), paymentMethod, createdBy, description || 'Correção');
  }

  const tx = await customerRepository.createTransaction(customerId, {
    type: 'deposit',
    amount,
    paymentMethod,
    createdBy,
    description: description || 'Depósito',
  });

  // Apply deposit to unpaid purchases in FIFO order
  await applyPaymentFIFO(customerId, amount);

  await auditLogService.logPaymentReceived(tx.id, customerId, createdBy,
    JSON.stringify({ type: 'deposit', amount, method: paymentMethod }));

  return tx;
}

// Apply payment to unpaid purchases in FIFO order (oldest first)
// Uses batched transactions (20 items per batch) for better atomicity
// Also syncs Sale.payments: reduces credit, adds balance, marks isPaid when credit=0
async function applyPaymentFIFO(customerId: string, amount: number): Promise<void> {
  const unpaidPurchases = await customerRepository.getUnpaidPurchases(customerId);
  let remaining = amount;
  
  // Preparar todas as atualizações
  const updates: { purchase: typeof unpaidPurchases[0]; toApply: number; newAmountPaid: number }[] = [];
  
  for (const purchase of unpaidPurchases) {
    if (remaining <= 0) break;
    
    const unpaidAmount = purchase.amount - purchase.amountPaid;
    const toApply = Math.min(remaining, unpaidAmount);
    const newAmountPaid = purchase.amountPaid + toApply;
    
    updates.push({ purchase, toApply, newAmountPaid });
    remaining -= toApply;
  }

  if (updates.length === 0) return;

  // Executar atualizações em batches
  // Cada update = 1 CustomerTransaction + 1 Sale (se existir) = até 2 items por purchase
  const BATCH_SIZE = 10; // 10 purchases = até 20 items por batch
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    try {
      // Atualizar CustomerTransactions
      for (const { purchase, newAmountPaid } of batch) {
        await customerRepository.updateTransactionAmountPaid(purchase.id, newAmountPaid);
      }
      
      // Atualizar Sales
      for (const { purchase, toApply } of batch) {
        if (purchase.saleId) {
          await syncSalePayments(purchase.saleId, toApply);
        }
      }
    } catch (err) {
      console.error(`[FIFO_BATCH_FAILED] Customer: ${customerId}, Batch: ${i / BATCH_SIZE}, Error: ${(err as Error).message}`);
      await reconciliationService.handleFIFOFailure(customerId, `applyPaymentFIFO.batch${i / BATCH_SIZE}`, err as Error);
      // Continua com próximos batches
    }
  }
}

// Sync Sale payments: reduce credit by amount, add balance payment
async function syncSalePayments(saleId: string, amountPaid: number): Promise<void> {
  const sale = await saleRepository.getSaleById(saleId);
  if (!sale) return;
  
  const payments = [...sale.payments];
  const creditIdx = payments.findIndex(p => p.method === 'credit');
  if (creditIdx === -1) return;
  
  const creditPayment = payments[creditIdx];
  const toDeduct = Math.min(amountPaid, creditPayment.amount);
  
  // Reduce credit
  creditPayment.amount -= toDeduct;
  
  // Add or update balance payment
  const balanceIdx = payments.findIndex(p => p.method === 'balance');
  if (balanceIdx >= 0) {
    payments[balanceIdx].amount += toDeduct;
  } else {
    payments.push({ method: 'balance', amount: toDeduct });
  }
  
  // Remove credit if zeroed
  if (creditPayment.amount <= 0) {
    payments.splice(creditIdx, 1);
  }
  
  // isPaid = no more credit
  const hasCredit = payments.some(p => p.method === 'credit' && p.amount > 0);
  await saleRepository.updateSalePayments(saleId, payments, !hasCredit);
}

// Devolver dinheiro ao cliente (saque)
export async function withdraw(
  customerId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  createdBy: string,
  description?: string
): Promise<CustomerTransaction> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  if (amount <= 0) throw new Error('ERR_INVALID_AMOUNT');

  const balance = await customerRepository.calculateBalance(customerId);
  if (amount > balance) throw new Error('ERR_INSUFFICIENT_BALANCE');

  const tx = await customerRepository.createTransaction(customerId, {
    type: 'withdrawal',
    amount,
    paymentMethod,
    createdBy,
    description: description || 'Devolução',
  });

  return tx;
}

// Registar compra (débito) - chamado pelo sales service
// Usa transação atômica para criar CustomerTransaction + atualizar Sale.payments
export async function recordPurchase(
  customerId: string,
  amount: number,
  saleId: string,
  createdBy: string,
  paidAmount: number = 0 // Amount paid immediately (from balance), rest is credit
): Promise<CustomerTransaction> {
  const customer = await getCustomer(customerId);
  
  // If no explicit paidAmount, use available positive balance
  let effectivePaidAmount = paidAmount;
  if (paidAmount === 0) {
    const balance = await customerRepository.calculateBalance(customerId);
    if (balance > 0) {
      effectivePaidAmount = Math.min(balance, amount);
    }
  }

  // Criar transação (sempre necessário)
  const tx = await customerRepository.createTransaction(customerId, {
    type: 'purchase',
    amount,
    saleId,
    createdBy,
    description: 'Compra',
    paidAmount: effectivePaidAmount,
  });

  // Sync Sale.payments se usou saldo (operação separada, não crítica)
  if (effectivePaidAmount > 0 && paidAmount === 0) {
    try {
      await syncSalePayments(saleId, effectivePaidAmount);
    } catch (err) {
      // Log falha mas não falha a operação principal
      console.error(`[SYNC_SALE_PAYMENTS_FAILED] Sale: ${saleId}, Error: ${(err as Error).message}`);
      await reconciliationService.handleFIFOFailure(customerId, 'recordPurchase.syncSalePayments', err as Error);
    }
  }

  return tx;
}

// Registar estorno de compra (crédito de volta)
export async function recordRefund(
  customerId: string,
  amount: number,
  saleId: string,
  createdBy: string
): Promise<CustomerTransaction> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const tx = await customerRepository.createTransaction(customerId, {
    type: 'refund',
    amount,
    saleId,
    createdBy,
    description: 'Estorno',
  });

  // Apply refund to unpaid purchases in FIFO order (money coming in)
  await applyPaymentFIFO(customerId, amount);

  return tx;
}

// Verificar se cliente pode fazer compra com valor X
export async function canPurchase(customerId: string, amount: number): Promise<{ allowed: boolean; availableCredit: number }> {
  const customer = await getCustomer(customerId);
  const balance = await customerRepository.calculateBalance(customerId);
  const availableCredit = balance + customer.creditLimit;
  return {
    allowed: amount <= availableCredit,
    availableCredit,
  };
}

export async function updateCreditLimit(customerId: string, creditLimit: number): Promise<Customer> {
  if (creditLimit < 0) throw new Error('ERR_INVALID_CREDIT_LIMIT');
  return customerRepository.updateCustomer(customerId, { creditLimit });
}

export async function renameCustomer(customerId: string, name: string): Promise<Customer> {
  if (!name?.trim()) throw new Error('ERR_INVALID_NAME');
  return customerRepository.updateCustomer(customerId, { name: name.trim() });
}

export async function updateCustomer(
  customerId: string,
  updates: { name?: string; initialBalance?: number }
): Promise<Customer> {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const updateData: Partial<Customer> = {};
  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw new Error('ERR_INVALID_NAME');
    updateData.name = updates.name.trim();
  }
  
  const initialBalanceChanged = updates.initialBalance !== undefined && updates.initialBalance !== (customer.initialBalance || 0);
  if (initialBalanceChanged) {
    updateData.initialBalance = updates.initialBalance;
  }

  const updated = await customerRepository.updateCustomer(customerId, updateData);

  // Recalculate FIFO if initialBalance changed
  if (initialBalanceChanged) {
    await recalculateFIFO(customerId);
  }

  return updated;
}

// Recalculate all amountPaid for purchases based on deposits and initialBalance
async function recalculateFIFO(customerId: string): Promise<void> {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) return;

  const txs = await customerRepository.getTransactionsByCustomer(customerId);
  const sorted = txs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Reset all purchase amountPaid to 0
  const purchases = sorted.filter(tx => tx.type === 'purchase');
  for (const p of purchases) {
    await customerRepository.updateTransactionAmountPaid(p.id.replace('tx#', ''), 0);
  }

  // Calculate available balance chronologically
  let available = customer.initialBalance || 0;
  
  for (const tx of sorted) {
    if (tx.type === 'deposit' || tx.type === 'refund') {
      available += tx.amount;
    } else if (tx.type === 'purchase') {
      // Apply available balance to this purchase
      const toApply = Math.min(Math.max(available, 0), tx.amount);
      if (toApply > 0) {
        await customerRepository.updateTransactionAmountPaid(tx.id.replace('tx#', ''), toApply);
        // Sync Sale.payments
        if (tx.saleId) {
          await syncSalePaymentsForRecalc(tx.saleId, toApply, tx.amount);
        }
      }
      available -= tx.amount;
    } else if (tx.type === 'withdrawal') {
      available -= tx.amount;
    }
  }
}

// Sync Sale payments after FIFO recalculation
async function syncSalePaymentsForRecalc(saleId: string, amountPaid: number, total: number): Promise<void> {
  const sale = await saleRepository.getSaleById(saleId);
  if (!sale) return;

  const creditAmount = total - amountPaid;
  const payments: PaymentPart[] = [];
  
  if (amountPaid > 0) {
    payments.push({ method: 'balance', amount: amountPaid });
  }
  if (creditAmount > 0) {
    payments.push({ method: 'credit', amount: creditAmount });
  }
  
  await saleRepository.updateSalePayments(saleId, payments, creditAmount === 0);
}

export async function deleteCustomer(id: string): Promise<Customer> {
  const txs = await customerRepository.getTransactionsByCustomer(id);
  const hasSales = txs.some(tx => tx.type === 'purchase');
  if (hasSales) throw new Error('ERR_CUSTOMER_HAS_SALES');
  return customerRepository.deleteCustomer(id);
}

export function resetService(): void {
  customerRepository.resetRepository();
}
