import { PaymentMethod } from './sale';

// Limite de crédito padrão (dívida máxima permitida)
export const DEFAULT_CREDIT_LIMIT = 100;

export interface Customer {
  id: string;
  name: string;
  creditLimit: number; // Limite de crédito (dívida máxima)
  createdAt: string;
  deletedAt?: string;
  version: number;
}

export interface CreateCustomerInput {
  name: string;
  creditLimit?: number;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'purchase' | 'refund';

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number; // Sempre positivo
  description?: string;
  saleId?: string;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  createdBy: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  description?: string;
  saleId?: string;
  paymentMethod?: PaymentMethod;
  createdBy: string;
}

export interface CustomerWithBalance extends Customer {
  balance: number; // Positivo = crédito, Negativo = dívida
}

export interface CustomerHistory {
  transactions: CustomerTransaction[];
  balance: number;
}

// Legacy - manter para compatibilidade durante migração
export interface CustomerPayment {
  id: string;
  customerId: string;
  payments: { method: PaymentMethod; amount: number }[];
  totalAmount: number;
  createdAt: string;
  version: number;
}

export interface RegisterPaymentInput {
  payments: { method: PaymentMethod; amount: number }[];
}
