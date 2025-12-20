import { Customer, CustomerTransaction, CustomerHistory, CustomerWithBalance, CustomerHistoryFilter, PaymentMethod, PaymentPart, DEFAULT_CREDIT_LIMIT, ReceiptItem } from '@cantina-pos/shared';
import * as customerRepository from '../repositories/customer.repository';
import * as saleRepository from '../repositories/sale.repository';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as auditLogService from './audit-log.service';

export async function createCustomer(name: string, creditLimit: number = DEFAULT_CREDIT_LIMIT): Promise<Customer> {
  if (!name?.trim()) throw new Error('ERR_EMPTY_NAME');
  return customerRepository.createCustomer(name.trim(), creditLimit);
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
  if (amount <= 0) throw new Error('ERR_INVALID_AMOUNT');

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
// Also syncs Sale.payments: reduces credit, adds balance, marks isPaid when credit=0
async function applyPaymentFIFO(customerId: string, amount: number): Promise<void> {
  const unpaidPurchases = await customerRepository.getUnpaidPurchases(customerId);
  let remaining = amount;
  
  for (const purchase of unpaidPurchases) {
    if (remaining <= 0) break;
    
    const unpaidAmount = purchase.amount - purchase.amountPaid;
    const toApply = Math.min(remaining, unpaidAmount);
    
    // Update CustomerTransaction.amountPaid
    await customerRepository.updateTransactionAmountPaid(purchase.id, purchase.amountPaid + toApply);
    
    // Sync with Sale if exists
    if (purchase.saleId) {
      await syncSalePayments(purchase.saleId, toApply);
    }
    
    remaining -= toApply;
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
export async function recordPurchase(
  customerId: string,
  amount: number,
  saleId: string,
  createdBy: string,
  paidAmount: number = 0 // Amount paid immediately (from balance), rest is credit
): Promise<CustomerTransaction> {
  const customer = await getCustomer(customerId);
  const balance = await customerRepository.calculateBalance(customerId);

  // Verificar limite de crédito
  const newBalance = balance - amount;
  if (newBalance < -customer.creditLimit) {
    throw new Error('ERR_CREDIT_LIMIT_EXCEEDED');
  }

  return customerRepository.createTransaction(customerId, {
    type: 'purchase',
    amount,
    saleId,
    createdBy,
    description: 'Compra',
    paidAmount, // Pass to repository
  });
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

export async function deleteCustomer(id: string): Promise<Customer> {
  return customerRepository.deleteCustomer(id);
}

export function resetService(): void {
  customerRepository.resetRepository();
}
