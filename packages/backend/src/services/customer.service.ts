import { Customer, CustomerPayment, CustomerHistory, PaymentPart, Sale } from '@cantina-pos/shared';
import * as customerRepository from '../repositories/customer.repository';
import * as salesService from './sales.service';
import * as auditLogService from './audit-log.service';

/**
 * Create a new customer
 * Requirements: 8.3
 * @param name - Customer name
 * @returns Created Customer
 * @throws Error if name is empty
 */
export function createCustomer(name: string): Customer {
  // Validate name is not empty (Requirements: 15.2)
  if (!name || !name.trim()) {
    throw new Error('ERR_EMPTY_NAME');
  }
  
  return customerRepository.createCustomer(name.trim());
}

/**
 * Search customers by name
 * Requirements: 8.2
 * @param query - Search query
 * @returns Array of matching Customers
 */
export function searchCustomers(query: string): Customer[] {
  if (!query || !query.trim()) {
    return customerRepository.getAllCustomers();
  }
  return customerRepository.searchCustomers(query);
}

/**
 * Get a customer by ID
 * @param id - Customer ID
 * @returns Customer
 * @throws Error if customer not found
 */
export function getCustomer(id: string): Customer {
  const customer = customerRepository.getCustomerById(id);
  if (!customer) {
    throw new Error('ERR_CUSTOMER_NOT_FOUND');
  }
  return customer;
}

/**
 * Get a customer by ID (returns undefined if not found)
 * @param id - Customer ID
 * @returns Customer or undefined
 */
export function getCustomerById(id: string): Customer | undefined {
  return customerRepository.getCustomerById(id);
}


/**
 * Check if a customer exists
 * @param id - Customer ID
 * @returns true if customer exists
 */
export function customerExists(id: string): boolean {
  return customerRepository.customerExists(id);
}

/**
 * Get customer balance (pending amount)
 * Requirements: 9.3
 * Balance = sum of unpaid sales - sum of payments
 * @param customerId - Customer ID
 * @returns Pending balance (positive = customer owes money)
 */
export function getCustomerBalance(customerId: string): number {
  // Validate customer exists
  if (!customerRepository.customerExists(customerId)) {
    throw new Error('ERR_CUSTOMER_NOT_FOUND');
  }
  
  // Get unpaid sales total
  const unpaidSales = salesService.getUnpaidSalesByCustomer(customerId);
  const totalUnpaid = unpaidSales.reduce((sum, sale) => {
    // For credit sales, calculate the credit portion
    const creditAmount = sale.payments
      .filter(p => p.method === 'credit')
      .reduce((s, p) => s + p.amount, 0);
    return sum + creditAmount;
  }, 0);
  
  // Get total payments
  const totalPayments = customerRepository.getTotalPaymentsByCustomer(customerId);
  
  // Balance = unpaid amount - payments made
  return Math.max(0, totalUnpaid - totalPayments);
}

/**
 * Get customer history (all sales and payments)
 * Requirements: 9.2
 * @param customerId - Customer ID
 * @returns CustomerHistory with sales and payments
 */
export function getCustomerHistory(customerId: string): CustomerHistory {
  // Validate customer exists
  if (!customerRepository.customerExists(customerId)) {
    throw new Error('ERR_CUSTOMER_NOT_FOUND');
  }
  
  const sales = salesService.getSalesByCustomer(customerId);
  const payments = customerRepository.getPaymentsByCustomer(customerId);
  
  return { sales, payments };
}

/**
 * Register a payment for a customer
 * Requirements: 9.4, 9.5, 9.6
 * @param customerId - Customer ID
 * @param payments - Payment parts
 * @returns Created CustomerPayment
 * @throws Error if customer not found or invalid payment
 */
export function registerPayment(
  customerId: string,
  payments: PaymentPart[]
): CustomerPayment {
  // Validate customer exists
  if (!customerRepository.customerExists(customerId)) {
    throw new Error('ERR_CUSTOMER_NOT_FOUND');
  }
  
  // Validate payments
  if (!payments || payments.length === 0) {
    throw new Error('ERR_NO_PAYMENT');
  }
  
  // Validate each payment amount is positive
  for (const payment of payments) {
    if (payment.amount <= 0) {
      throw new Error('ERR_INVALID_PAYMENT_AMOUNT');
    }
    // Credit is not valid for customer payments
    if (payment.method === 'credit') {
      throw new Error('ERR_INVALID_PAYMENT_METHOD');
    }
  }
  
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  // Get current balance
  const currentBalance = getCustomerBalance(customerId);
  
  // Payment cannot exceed balance
  if (totalAmount > currentBalance + 0.01) { // Allow small floating point difference
    throw new Error('ERR_PAYMENT_EXCEEDS_BALANCE');
  }
  
  // Register the payment
  const customerPayment = customerRepository.registerPayment(customerId, payments);

  // Log payment for audit trail (Requirements: 17.2)
  // Note: userId would come from the authenticated user context in production
  auditLogService.logPaymentReceived(
    customerPayment.id,
    customerId,
    'system', // In production, this would be the authenticated user ID
    JSON.stringify({ totalAmount: customerPayment.totalAmount, methods: payments.map(p => p.method) })
  );

  // Check if any sales should be marked as paid
  updateSalesPaidStatus(customerId);

  return customerPayment;
}

/**
 * Update paid status of sales based on payments
 * @param customerId - Customer ID
 */
function updateSalesPaidStatus(customerId: string): void {
  const unpaidSales = salesService.getUnpaidSalesByCustomer(customerId);
  const totalPayments = customerRepository.getTotalPaymentsByCustomer(customerId);
  
  let remainingPayments = totalPayments;
  
  // Sort sales by date (oldest first) to pay off in order
  const sortedSales = [...unpaidSales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  for (const sale of sortedSales) {
    const creditAmount = sale.payments
      .filter(p => p.method === 'credit')
      .reduce((s, p) => s + p.amount, 0);
    
    if (remainingPayments >= creditAmount - 0.01) {
      // Mark sale as paid
      salesService.markSaleAsPaid(sale.id);
      remainingPayments -= creditAmount;
    } else {
      break;
    }
  }
}

/**
 * Delete a customer (soft delete)
 * @param id - Customer ID
 * @returns Deleted Customer
 */
export function deleteCustomer(id: string): Customer {
  return customerRepository.deleteCustomer(id);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  customerRepository.resetRepository();
}
