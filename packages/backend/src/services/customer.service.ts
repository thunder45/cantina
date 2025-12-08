import { Customer, CustomerPayment, CustomerHistory, PaymentPart } from '@cantina-pos/shared';
import * as customerRepository from '../repositories/customer.repository';
import * as salesService from './sales.service';
import * as auditLogService from './audit-log.service';

export async function createCustomer(name: string): Promise<Customer> {
  if (!name?.trim()) throw new Error('ERR_EMPTY_NAME');
  return customerRepository.createCustomer(name.trim());
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query?.trim()) return customerRepository.getAllCustomers();
  return customerRepository.searchCustomers(query);
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

export async function getCustomerBalance(customerId: string): Promise<number> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const unpaidSales = await salesService.getUnpaidSalesByCustomer(customerId);
  const totalUnpaid = unpaidSales.reduce((sum, sale) => {
    const creditAmount = sale.payments.filter(p => p.method === 'credit').reduce((s, p) => s + p.amount, 0);
    return sum + creditAmount;
  }, 0);

  const totalPayments = await customerRepository.getTotalPaymentsByCustomer(customerId);
  return Math.max(0, totalUnpaid - totalPayments);
}

export async function getCustomerHistory(customerId: string): Promise<CustomerHistory> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  const sales = await salesService.getSalesByCustomer(customerId);
  const payments = await customerRepository.getPaymentsByCustomer(customerId);
  return { sales, payments };
}

export async function registerPayment(customerId: string, payments: PaymentPart[]): Promise<CustomerPayment> {
  if (!await customerRepository.customerExists(customerId)) throw new Error('ERR_CUSTOMER_NOT_FOUND');
  if (!payments?.length) throw new Error('ERR_NO_PAYMENT');

  for (const payment of payments) {
    if (payment.amount <= 0) throw new Error('ERR_INVALID_PAYMENT_AMOUNT');
    if (payment.method === 'credit') throw new Error('ERR_INVALID_PAYMENT_METHOD');
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const currentBalance = await getCustomerBalance(customerId);
  if (totalAmount > currentBalance + 0.01) throw new Error('ERR_PAYMENT_EXCEEDS_BALANCE');

  const customerPayment = await customerRepository.registerPayment(customerId, payments);

  auditLogService.logPaymentReceived(customerPayment.id, customerId, 'system',
    JSON.stringify({ totalAmount: customerPayment.totalAmount, methods: payments.map(p => p.method) }));

  await updateSalesPaidStatus(customerId);
  return customerPayment;
}

async function updateSalesPaidStatus(customerId: string): Promise<void> {
  const unpaidSales = await salesService.getUnpaidSalesByCustomer(customerId);
  const totalPayments = await customerRepository.getTotalPaymentsByCustomer(customerId);

  let remainingPayments = totalPayments;
  const sortedSales = [...unpaidSales].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const sale of sortedSales) {
    const creditAmount = sale.payments.filter(p => p.method === 'credit').reduce((s, p) => s + p.amount, 0);
    if (remainingPayments >= creditAmount - 0.01) {
      await salesService.markSaleAsPaid(sale.id);
      remainingPayments -= creditAmount;
    } else {
      break;
    }
  }
}

export async function deleteCustomer(id: string): Promise<Customer> {
  return customerRepository.deleteCustomer(id);
}

export function resetService(): void {
  customerRepository.resetRepository();
}
