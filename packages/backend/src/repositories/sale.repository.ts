import { Sale, PaymentPart, OrderItem, Refund } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for sales (simulates DynamoDB)
 * Key: saleId, Value: Sale
 */
let sales: Map<string, Sale> = new Map();

/**
 * In-memory storage for refunds
 * Key: refundId, Value: Refund
 */
let refunds: Map<string, Refund> = new Map();

/**
 * Create a new sale
 * Requirements: 7.4
 * @param eventId - Event ID
 * @param orderId - Order ID
 * @param items - Order items
 * @param total - Total amount
 * @param payments - Payment parts
 * @param createdBy - User who created the sale
 * @param customerId - Optional customer ID for credit sales
 * @returns Created Sale
 */
export function createSale(
  eventId: string,
  orderId: string,
  items: OrderItem[],
  total: number,
  payments: PaymentPart[],
  createdBy: string,
  customerId?: string
): Sale {
  const id = uuidv4();
  
  // Determine if sale is paid (credit sales are not paid)
  const hasCredit = payments.some(p => p.method === 'credit');
  
  const sale: Sale = {
    id,
    eventId,
    orderId,
    items: [...items],
    total,
    payments: [...payments],
    customerId,
    isPaid: !hasCredit,
    isRefunded: false,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  
  sales.set(id, sale);
  return sale;
}

/**
 * Get a sale by ID
 * @param id - Sale ID
 * @returns Sale or undefined
 */
export function getSaleById(id: string): Sale | undefined {
  return sales.get(id);
}

/**
 * Check if a sale exists
 * @param id - Sale ID
 * @returns true if sale exists
 */
export function saleExists(id: string): boolean {
  return sales.has(id);
}

/**
 * Get sales by event
 * Requirements: 10.1
 * @param eventId - Event ID
 * @returns Array of Sales
 */
export function getSalesByEvent(eventId: string): Sale[] {
  return Array.from(sales.values())
    .filter(sale => sale.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get sales by customer
 * Requirements: 9.2
 * @param customerId - Customer ID
 * @returns Array of Sales
 */
export function getSalesByCustomer(customerId: string): Sale[] {
  return Array.from(sales.values())
    .filter(sale => sale.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get unpaid sales by customer
 * Requirements: 9.3
 * @param customerId - Customer ID
 * @returns Array of unpaid Sales
 */
export function getUnpaidSalesByCustomer(customerId: string): Sale[] {
  return Array.from(sales.values())
    .filter(sale => sale.customerId === customerId && !sale.isPaid && !sale.isRefunded);
}

/**
 * Mark a sale as refunded
 * Requirements: 14.1, 14.2, 14.3
 * @param saleId - Sale ID
 * @param reason - Refund reason
 * @param refundedBy - User who performed the refund
 * @returns Updated Sale and Refund record
 * @throws Error if sale not found or already refunded
 */
export function refundSale(saleId: string, reason: string, refundedBy: string): { sale: Sale; refund: Refund } {
  const sale = sales.get(saleId);
  
  if (!sale) {
    throw new Error('ERR_SALE_NOT_FOUND');
  }
  
  if (sale.isRefunded) {
    throw new Error('ERR_SALE_ALREADY_REFUNDED');
  }
  
  const refundId = uuidv4();
  const now = new Date().toISOString();
  
  const refund: Refund = {
    id: refundId,
    saleId,
    reason,
    createdBy: refundedBy,
    createdAt: now,
  };
  
  const updatedSale: Sale = {
    ...sale,
    isRefunded: true,
    refundReason: reason,
    refundedAt: now,
  };
  
  sales.set(saleId, updatedSale);
  refunds.set(refundId, refund);
  
  return { sale: updatedSale, refund };
}

/**
 * Mark a sale as paid
 * @param saleId - Sale ID
 * @returns Updated Sale
 * @throws Error if sale not found
 */
export function markSaleAsPaid(saleId: string): Sale {
  const sale = sales.get(saleId);
  
  if (!sale) {
    throw new Error('ERR_SALE_NOT_FOUND');
  }
  
  const updatedSale: Sale = {
    ...sale,
    isPaid: true,
  };
  
  sales.set(saleId, updatedSale);
  return updatedSale;
}

/**
 * Get a refund by sale ID
 * @param saleId - Sale ID
 * @returns Refund or undefined
 */
export function getRefundBySaleId(saleId: string): Refund | undefined {
  return Array.from(refunds.values()).find(r => r.saleId === saleId);
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  sales = new Map();
  refunds = new Map();
}

/**
 * Get count of sales (for testing purposes)
 * @param eventId - Optional filter by event
 */
export function getSaleCount(eventId?: string): number {
  if (eventId) {
    return Array.from(sales.values()).filter(sale => sale.eventId === eventId).length;
  }
  return sales.size;
}
