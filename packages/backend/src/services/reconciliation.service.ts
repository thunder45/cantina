import * as customerRepository from '../repositories/customer.repository';
import * as transactionRepository from '../repositories/customer-transaction.repository';
import * as saleRepository from '../repositories/sale.repository';
import { PaymentPart } from '@cantina-pos/shared';

interface ReconciliationResult {
  customerId: string;
  customerName: string;
  issues: string[];
  fixed: boolean;
}

interface ReconciliationReport {
  timestamp: string;
  totalCustomers: number;
  customersWithIssues: number;
  results: ReconciliationResult[];
}

/**
 * Reconcilia dados de FIFO para um cliente específico.
 * Verifica se amountPaid das compras está consistente com depósitos.
 */
export async function reconcileCustomer(customerId: string): Promise<ReconciliationResult> {
  const customer = await customerRepository.getCustomerById(customerId);
  if (!customer) {
    return { customerId, customerName: 'N/A', issues: ['Cliente não encontrado'], fixed: false };
  }

  const issues: string[] = [];
  const txs = await transactionRepository.getTransactionsByCustomer(customerId);
  const sorted = txs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Calcular o que deveria ser o amountPaid de cada compra
  const expectedAmountPaid = new Map<string, number>();
  let available = customer.initialBalance || 0;

  for (const tx of sorted) {
    if (tx.type === 'deposit' || tx.type === 'refund') {
      available += tx.amount;
    } else if (tx.type === 'purchase') {
      const toApply = Math.min(Math.max(available, 0), tx.amount);
      expectedAmountPaid.set(tx.id, toApply);
      available -= tx.amount;
    } else if (tx.type === 'withdrawal') {
      available -= tx.amount;
    }
  }

  // Verificar discrepâncias
  const purchases = sorted.filter(tx => tx.type === 'purchase');
  const discrepancies: { txId: string; expected: number; actual: number; saleId?: string }[] = [];

  for (const purchase of purchases) {
    const expected = expectedAmountPaid.get(purchase.id) || 0;
    const actual = purchase.amountPaid || 0;

    if (Math.abs(expected - actual) > 0.01) { // Tolerância de 1 centavo
      discrepancies.push({
        txId: purchase.id,
        expected,
        actual,
        saleId: purchase.saleId,
      });
      issues.push(`Transação ${purchase.id}: amountPaid esperado ${expected}, atual ${actual}`);
    }
  }

  // Corrigir discrepâncias
  let fixed = false;
  if (discrepancies.length > 0) {
    try {
      for (const d of discrepancies) {
        // Corrigir CustomerTransaction.amountPaid
        await transactionRepository.updateTransactionAmountPaid(customerId, d.txId, d.expected);

        // Corrigir Sale.payments se existir
        if (d.saleId) {
          const sale = await saleRepository.getSaleById(d.saleId);
          if (sale) {
            const purchase = purchases.find(p => p.id === d.txId);
            if (purchase) {
              const creditAmount = purchase.amount - d.expected;
              const payments: PaymentPart[] = [];
              
              if (d.expected > 0) {
                payments.push({ method: 'balance', amount: d.expected });
              }
              if (creditAmount > 0) {
                payments.push({ method: 'credit', amount: creditAmount });
              }
              
              await saleRepository.updateSalePayments(d.saleId, payments, creditAmount === 0);
            }
          }
        }
      }
      fixed = true;
      issues.push(`✅ ${discrepancies.length} discrepâncias corrigidas`);
    } catch (err) {
      issues.push(`❌ Erro ao corrigir: ${(err as Error).message}`);
    }
  }

  return { customerId, customerName: customer.name, issues, fixed };
}

/**
 * Reconcilia todos os clientes.
 * Chamado semanalmente ou após falhas.
 */
export async function reconcileAll(): Promise<ReconciliationReport> {
  const timestamp = new Date().toISOString();
  const customers = await customerRepository.getAllCustomers();
  const results: ReconciliationResult[] = [];

  for (const customer of customers) {
    const result = await reconcileCustomer(customer.id);
    if (result.issues.length > 0) {
      results.push(result);
    }
  }

  const report: ReconciliationReport = {
    timestamp,
    totalCustomers: customers.length,
    customersWithIssues: results.length,
    results,
  };

  if (results.length > 0) {
    console.log(`[RECONCILIATION_COMPLETED] Total: ${report.totalCustomers}, Issues: ${report.customersWithIssues}`);
  }

  return report;
}

/**
 * Chamado quando uma operação FIFO falha.
 * Tenta reconciliar o cliente afetado.
 */
export async function handleFIFOFailure(
  customerId: string,
  operation: string,
  error: Error
): Promise<void> {
  console.error(`[FIFO_FAILURE] Customer: ${customerId}, Operation: ${operation}, Error: ${error.message}`);

  // Tentar reconciliar
  try {
    const result = await reconcileCustomer(customerId);
    console.log(`[FIFO_RECONCILIATION] Customer: ${customerId}, Issues: ${result.issues.length}, Fixed: ${result.fixed}`);
  } catch (reconcileError) {
    console.error(`[FIFO_RECONCILIATION_FAILED] Customer: ${customerId}, Error: ${(reconcileError as Error).message}`);
  }
}
