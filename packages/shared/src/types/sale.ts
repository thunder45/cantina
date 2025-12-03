import { OrderItem } from './order';

/**
 * PaymentMethod - Formas de pagamento disponíveis
 */
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

/**
 * PaymentPart - Parte de um pagamento (para pagamentos mistos)
 */
export interface PaymentPart {
  method: PaymentMethod;
  amount: number;
}

/**
 * Sale - Transação confirmada com itens, valores e forma de pagamento registrados
 */
export interface Sale {
  id: string;
  eventId: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  payments: PaymentPart[];
  customerId?: string; // For credit sales
  isPaid: boolean;
  isRefunded: boolean;
  refundReason?: string;
  refundedAt?: string;
  createdBy: string;  // User who created the sale (from Cognito)
  createdAt: string;
}

export interface ConfirmSaleInput {
  orderId: string;
  payments: PaymentPart[];
  customerId?: string;
}

/**
 * Refund - Reversão de uma venda confirmada
 */
export interface Refund {
  id: string;
  saleId: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface RefundSaleInput {
  reason: string;
}

/**
 * Receipt - Comprovante de venda com detalhes da transação
 */
export interface Receipt {
  saleId: string;
  eventName: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  payments: PaymentPart[];
  customerName?: string;
  createdAt: string;
  createdBy: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
