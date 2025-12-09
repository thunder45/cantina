import { Sale, PaymentPart, Refund, Receipt } from '@cantina-pos/shared';
import * as saleRepository from '../repositories/sale.repository';
import * as orderService from './order.service';
import * as menuItemService from './menu-item.service';
import * as eventService from './event.service';
import * as customerService from './customer.service';
import * as auditLogService from './audit-log.service';

export async function confirmSale(
  orderId: string,
  payments: PaymentPart[],
  createdBy: string,
  customerId?: string
): Promise<Sale> {
  const order = await orderService.getOrder(orderId);
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');
  if (order.items.length === 0) throw new Error('ERR_ORDER_EMPTY');
  if (!payments?.length) throw new Error('ERR_NO_PAYMENT');

  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  if (Math.abs(paymentTotal - order.total) > 0.01) throw new Error('ERR_PAYMENT_MISMATCH');
  for (const payment of payments) {
    if (payment.amount <= 0) throw new Error('ERR_INVALID_PAYMENT_AMOUNT');
  }

  // Check if using customer balance or credit
  const balancePayment = payments.find(p => p.method === 'balance');
  const creditPayment = payments.find(p => p.method === 'credit');
  
  if ((balancePayment || creditPayment) && !customerId) {
    throw new Error('ERR_CUSTOMER_REQUIRED');
  }

  // Validate customer can make purchase if using balance (credit/fiado always allowed)
  if (customerId && balancePayment) {
    const { allowed } = await customerService.canPurchase(customerId, balancePayment.amount);
    if (!allowed) throw new Error('ERR_CREDIT_LIMIT_EXCEEDED');
  }

  // Update menu item sold counts
  for (const item of order.items) {
    await menuItemService.incrementSoldCount(item.menuItemId, item.quantity);
  }

  await orderService.confirmOrder(orderId);

  const sale = await saleRepository.createSale(
    order.eventId, orderId, order.items, order.total, payments, createdBy, customerId
  );

  // Record purchase transaction for customer
  if (customerId && (balancePayment || creditPayment)) {
    const totalFromCustomer = (balancePayment?.amount || 0) + (creditPayment?.amount || 0);
    await customerService.recordPurchase(customerId, totalFromCustomer, sale.id, createdBy);
  }

  await auditLogService.logSaleCreation(sale.id, createdBy, 
    JSON.stringify({ eventId: sale.eventId, total: sale.total, items: sale.items.length }));

  return sale;
}

export async function getSale(saleId: string): Promise<Sale> {
  const sale = await saleRepository.getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');
  return sale;
}

export async function getSaleById(saleId: string): Promise<Sale | undefined> {
  return saleRepository.getSaleById(saleId);
}

export async function getSalesByEvent(eventId: string): Promise<Sale[]> {
  return saleRepository.getSalesByEvent(eventId);
}

export async function getSalesByCustomer(customerId: string): Promise<Sale[]> {
  return saleRepository.getSalesByCustomer(customerId);
}

export async function getUnpaidSalesByCustomer(customerId: string): Promise<Sale[]> {
  return saleRepository.getUnpaidSalesByCustomer(customerId);
}

export async function refundSale(saleId: string, reason: string, refundedBy: string): Promise<Refund> {
  const sale = await saleRepository.getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');
  if (sale.isRefunded) throw new Error('ERR_SALE_ALREADY_REFUNDED');
  if (!reason?.trim()) throw new Error('ERR_EMPTY_REFUND_REASON');

  for (const item of sale.items) {
    await menuItemService.decrementSoldCount(item.menuItemId, item.quantity);
  }

  // Refund customer balance if sale used balance/credit
  if (sale.customerId) {
    const balancePayment = sale.payments.find(p => p.method === 'balance');
    const creditPayment = sale.payments.find(p => p.method === 'credit');
    const totalFromCustomer = (balancePayment?.amount || 0) + (creditPayment?.amount || 0);
    if (totalFromCustomer > 0) {
      await customerService.recordRefund(sale.customerId, totalFromCustomer, saleId, refundedBy);
    }
  }

  const { refund } = await saleRepository.refundSale(saleId, reason.trim(), refundedBy);
  await auditLogService.logSaleRefund(saleId, refundedBy, reason.trim());
  return refund;
}

export async function getReceipt(saleId: string): Promise<Receipt> {
  const sale = await saleRepository.getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');

  const event = await eventService.getEvent(sale.eventId);
  const receiptItems = sale.items.map(item => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.price,
    total: item.price * item.quantity,
  }));

  return {
    saleId: sale.id,
    eventName: event.name,
    items: receiptItems,
    subtotal: sale.total,
    total: sale.total,
    payments: sale.payments,
    createdAt: sale.createdAt,
    createdBy: sale.createdBy,
  };
}

export async function markSaleAsPaid(saleId: string): Promise<Sale> {
  return saleRepository.markSaleAsPaid(saleId);
}

export async function saleExists(saleId: string): Promise<boolean> {
  return saleRepository.saleExists(saleId);
}

export function resetService(): void {
  saleRepository.resetRepository();
}
