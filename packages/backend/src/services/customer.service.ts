import { Customer, CustomerTransaction, CustomerHistory, CustomerWithBalance, PaymentMethod, DEFAULT_CREDIT_LIMIT } from '@cantina-pos/shared';
import * as customerRepository from '../repositories/customer.repository';
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

export async function getCustomerHistory(customerId: string): Promise<CustomerHistory> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  const transactions = await customerRepository.getTransactionsByCustomer(customerId);
  const balance = await customerRepository.calculateBalance(customerId);
  return { transactions, balance };
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

  await auditLogService.logPaymentReceived(tx.id, customerId, createdBy,
    JSON.stringify({ type: 'deposit', amount, method: paymentMethod }));

  return tx;
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
  createdBy: string
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

  return customerRepository.createTransaction(customerId, {
    type: 'refund',
    amount,
    saleId,
    createdBy,
    description: 'Estorno',
  });
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
