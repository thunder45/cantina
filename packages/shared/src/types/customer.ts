import { PaymentPart } from './sale';

/**
 * Customer - Cliente anotado que opta por pagar posteriormente
 */
export interface Customer {
  id: string;
  name: string;
  createdAt: string;
  deletedAt?: string; // Soft delete
  version: number; // For optimistic locking
}

export interface CreateCustomerInput {
  name: string;
}

/**
 * CustomerPayment - Pagamento registrado para um cliente
 */
export interface CustomerPayment {
  id: string;
  customerId: string;
  payments: PaymentPart[];
  totalAmount: number;
  createdAt: string;
  version: number; // For optimistic locking
}

export interface RegisterPaymentInput {
  payments: PaymentPart[];
}

/**
 * CustomerHistory - Histórico completo de um cliente
 */
export interface CustomerHistory {
  sales: import('./sale').Sale[];
  payments: CustomerPayment[];
}
