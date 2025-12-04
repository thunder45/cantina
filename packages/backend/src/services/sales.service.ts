import { Sale, PaymentPart, Refund, Receipt } from '@cantina-pos/shared';
import * as saleRepository from '../repositories/sale.repository';
import * as orderService from './order.service';
import * as menuItemService from './menu-item.service';
import * as eventService from './event.service';

/**
 * Confirm a sale from an order
 * Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 17.1
 * @param orderId - Order ID
 * @param payments - Payment parts
 * @param createdBy - User who created the sale
 * @param customerId - Optional customer ID for credit sales
 * @returns Created Sale
 * @throws Error if validation fails
 */
export function confirmSale(
  orderId: string,
  payments: PaymentPart[],
  createdBy: string,
  customerId?: string
): Sale {
  // Get and validate order
  const order = orderService.getOrder(orderId);
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  if (order.items.length === 0) {
    throw new Error('ERR_ORDER_EMPTY');
  }
  
  // Validate payments
  if (!payments || payments.length === 0) {
    throw new Error('ERR_NO_PAYMENT');
  }
  
  // Validate payment total matches order total (Requirements: 7.3)
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentTotal - order.total) > 0.01) { // Allow small floating point difference
    throw new Error('ERR_PAYMENT_MISMATCH');
  }
  
  // Validate each payment amount is positive
  for (const payment of payments) {
    if (payment.amount <= 0) {
      throw new Error('ERR_INVALID_PAYMENT_AMOUNT');
    }
  }
  
  // If credit payment, customer ID is required (Requirements: 8.1)
  const hasCredit = payments.some(p => p.method === 'credit');
  if (hasCredit && !customerId) {
    throw new Error('ERR_CUSTOMER_REQUIRED_FOR_CREDIT');
  }
  
  // Decrement stock for each item (Requirements: 6.1)
  for (const item of order.items) {
    menuItemService.incrementSoldCount(item.menuItemId, item.quantity);
  }
  
  // Mark order as confirmed
  orderService.confirmOrder(orderId);
  
  // Create sale record
  const sale = saleRepository.createSale(
    order.eventId,
    orderId,
    order.items,
    order.total,
    payments,
    createdBy,
    customerId
  );
  
  return sale;
}

/**
 * Get a sale by ID
 * @param saleId - Sale ID
 * @returns Sale
 * @throws Error if sale not found
 */
export function getSale(saleId: string): Sale {
  const sale = saleRepository.getSaleById(saleId);
  if (!sale) {
    throw new Error('ERR_SALE_NOT_FOUND');
  }
  return sale;
}

/**
 * Get a sale by ID (returns undefined if not found)
 * @param saleId - Sale ID
 * @returns Sale or undefined
 */
export function getSaleById(saleId: string): Sale | undefined {
  return saleRepository.getSaleById(saleId);
}

/**
 * Get sales by event
 * @param eventId - Event ID
 * @returns Array of Sales
 */
export function getSalesByEvent(eventId: string): Sale[] {
  return saleRepository.getSalesByEvent(eventId);
}

/**
 * Get sales by customer
 * Requirements: 9.2
 * @param customerId - Customer ID
 * @returns Array of Sales
 */
export function getSalesByCustomer(customerId: string): Sale[] {
  return saleRepository.getSalesByCustomer(customerId);
}

/**
 * Get unpaid sales by customer
 * Requirements: 9.3
 * @param customerId - Customer ID
 * @returns Array of unpaid Sales
 */
export function getUnpaidSalesByCustomer(customerId: string): Sale[] {
  return saleRepository.getUnpaidSalesByCustomer(customerId);
}

/**
 * Refund a sale
 * Requirements: 14.1, 14.2, 14.3, 14.4
 * @param saleId - Sale ID
 * @param reason - Refund reason
 * @param refundedBy - User who performed the refund
 * @returns Refund record
 * @throws Error if sale not found or already refunded
 */
export function refundSale(saleId: string, reason: string, refundedBy: string): Refund {
  const sale = saleRepository.getSaleById(saleId);
  
  if (!sale) {
    throw new Error('ERR_SALE_NOT_FOUND');
  }
  
  if (sale.isRefunded) {
    throw new Error('ERR_SALE_ALREADY_REFUNDED');
  }
  
  // Validate reason is not empty
  if (!reason || !reason.trim()) {
    throw new Error('ERR_EMPTY_REFUND_REASON');
  }
  
  // Restore stock for each item (Requirements: 14.1)
  for (const item of sale.items) {
    menuItemService.decrementSoldCount(item.menuItemId, item.quantity);
  }
  
  // Mark sale as refunded
  const { refund } = saleRepository.refundSale(saleId, reason.trim(), refundedBy);
  
  return refund;
}

/**
 * Get receipt for a sale
 * Requirements: 16.1, 16.2, 16.3
 * @param saleId - Sale ID
 * @returns Receipt
 * @throws Error if sale not found
 */
export function getReceipt(saleId: string): Receipt {
  const sale = saleRepository.getSaleById(saleId);
  
  if (!sale) {
    throw new Error('ERR_SALE_NOT_FOUND');
  }
  
  // Get event name
  const event = eventService.getEvent(sale.eventId);
  
  const receiptItems = sale.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.price,
    total: item.price * item.quantity,
  }));
  
  const receipt: Receipt = {
    saleId: sale.id,
    eventName: event.name,
    items: receiptItems,
    subtotal: sale.total,
    total: sale.total,
    payments: sale.payments,
    createdAt: sale.createdAt,
    createdBy: sale.createdBy,
  };
  
  return receipt;
}

/**
 * Mark a sale as paid (for credit sales that are later paid)
 * @param saleId - Sale ID
 * @returns Updated Sale
 */
export function markSaleAsPaid(saleId: string): Sale {
  return saleRepository.markSaleAsPaid(saleId);
}

/**
 * Check if a sale exists
 * @param saleId - Sale ID
 * @returns true if sale exists
 */
export function saleExists(saleId: string): boolean {
  return saleRepository.saleExists(saleId);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  saleRepository.resetRepository();
}
