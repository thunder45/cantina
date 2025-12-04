import { Customer, CustomerPayment, PaymentPart } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for customers (simulates DynamoDB)
 * Key: customerId, Value: Customer
 */
let customers: Map<string, Customer> = new Map();

/**
 * In-memory storage for customer payments
 * Key: paymentId, Value: CustomerPayment
 */
let customerPayments: Map<string, CustomerPayment> = new Map();

/**
 * Create a new customer
 * Requirements: 8.3
 * @param name - Customer name
 * @returns Created Customer
 */
export function createCustomer(name: string): Customer {
  const id = uuidv4();
  
  const customer: Customer = {
    id,
    name,
    createdAt: new Date().toISOString(),
    version: 1, // Initialize version for optimistic locking
  };
  
  customers.set(id, customer);
  return customer;
}

/**
 * Get a customer by ID
 * @param id - Customer ID
 * @returns Customer or undefined
 */
export function getCustomerById(id: string): Customer | undefined {
  const customer = customers.get(id);
  if (customer && customer.deletedAt) {
    return undefined; // Soft deleted
  }
  return customer;
}

/**
 * Check if a customer exists
 * @param id - Customer ID
 * @returns true if customer exists and is not deleted
 */
export function customerExists(id: string): boolean {
  const customer = customers.get(id);
  return customer !== undefined && !customer.deletedAt;
}


/**
 * Search customers by name
 * Requirements: 8.2
 * @param query - Search query
 * @returns Array of matching Customers
 */
export function searchCustomers(query: string): Customer[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  return Array.from(customers.values())
    .filter(customer => 
      !customer.deletedAt && 
      customer.name.toLowerCase().includes(normalizedQuery)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all customers (excluding soft deleted)
 * @returns Array of Customers
 */
export function getAllCustomers(): Customer[] {
  return Array.from(customers.values())
    .filter(customer => !customer.deletedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Soft delete a customer
 * @param id - Customer ID
 * @returns Updated Customer
 * @throws Error if customer not found
 */
export function deleteCustomer(id: string): Customer {
  const customer = customers.get(id);
  
  if (!customer || customer.deletedAt) {
    throw new Error('ERR_CUSTOMER_NOT_FOUND');
  }
  
  const updatedCustomer: Customer = {
    ...customer,
    deletedAt: new Date().toISOString(),
    version: customer.version + 1, // Increment version for optimistic locking
  };
  
  customers.set(id, updatedCustomer);
  return updatedCustomer;
}

/**
 * Register a payment for a customer
 * Requirements: 9.4, 9.5, 9.6
 * @param customerId - Customer ID
 * @param payments - Payment parts
 * @returns Created CustomerPayment
 */
export function registerPayment(
  customerId: string,
  payments: PaymentPart[]
): CustomerPayment {
  const id = uuidv4();
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const customerPayment: CustomerPayment = {
    id,
    customerId,
    payments: [...payments],
    totalAmount,
    createdAt: new Date().toISOString(),
    version: 1, // Initialize version for optimistic locking
  };
  
  customerPayments.set(id, customerPayment);
  return customerPayment;
}

/**
 * Get payments by customer
 * Requirements: 9.2
 * @param customerId - Customer ID
 * @returns Array of CustomerPayments
 */
export function getPaymentsByCustomer(customerId: string): CustomerPayment[] {
  return Array.from(customerPayments.values())
    .filter(payment => payment.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get total payments amount by customer
 * @param customerId - Customer ID
 * @returns Total amount paid
 */
export function getTotalPaymentsByCustomer(customerId: string): number {
  return Array.from(customerPayments.values())
    .filter(payment => payment.customerId === customerId)
    .reduce((sum, payment) => sum + payment.totalAmount, 0);
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  customers = new Map();
  customerPayments = new Map();
}

/**
 * Get count of customers (for testing purposes)
 */
export function getCustomerCount(): number {
  return Array.from(customers.values()).filter(c => !c.deletedAt).length;
}

/**
 * Get count of payments (for testing purposes)
 */
export function getPaymentCount(): number {
  return customerPayments.size;
}
