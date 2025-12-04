import { AuditLog } from '@cantina-pos/shared';
import * as auditLogRepository from '../repositories/audit-log.repository';

/**
 * Audit Log Service
 * Provides audit trail functionality for tracking all changes
 * 
 * Requirements: 17.1, 17.2, 17.3
 */

/**
 * Log a sale creation
 * Requirements: 17.1
 * @param saleId - Sale ID
 * @param userId - User who created the sale
 * @param saleData - Sale data as JSON string
 * @returns Created AuditLog
 */
export function logSaleCreation(
  saleId: string,
  userId: string,
  saleData: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'sale',
    entityId: saleId,
    action: 'create',
    newValue: saleData,
    userId,
  });
}

/**
 * Log a sale refund
 * Requirements: 17.1
 * @param saleId - Sale ID
 * @param userId - User who performed the refund
 * @param reason - Refund reason
 * @returns Created AuditLog
 */
export function logSaleRefund(
  saleId: string,
  userId: string,
  reason: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'sale',
    entityId: saleId,
    action: 'refund',
    newValue: reason,
    userId,
  });
}


/**
 * Log a payment received
 * Requirements: 17.2
 * @param paymentId - Payment ID
 * @param customerId - Customer ID
 * @param userId - User who received the payment
 * @param paymentData - Payment data as JSON string
 * @returns Created AuditLog
 */
export function logPaymentReceived(
  paymentId: string,
  customerId: string,
  userId: string,
  paymentData: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'payment',
    entityId: paymentId,
    action: 'create',
    newValue: JSON.stringify({ customerId, payment: paymentData }),
    userId,
  });
}

/**
 * Log a price change
 * Requirements: 17.3
 * @param itemId - Item ID (catalog or menu item)
 * @param userId - User who changed the price
 * @param previousPrice - Previous price
 * @param newPrice - New price
 * @returns Created AuditLog
 */
export function logPriceChange(
  itemId: string,
  userId: string,
  previousPrice: number,
  newPrice: number
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'price',
    entityId: itemId,
    action: 'update',
    previousValue: previousPrice.toString(),
    newValue: newPrice.toString(),
    userId,
  });
}

/**
 * Log an item creation
 * @param itemId - Item ID
 * @param userId - User who created the item
 * @param itemData - Item data as JSON string
 * @returns Created AuditLog
 */
export function logItemCreation(
  itemId: string,
  userId: string,
  itemData: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'item',
    entityId: itemId,
    action: 'create',
    newValue: itemData,
    userId,
  });
}

/**
 * Log an item update
 * @param itemId - Item ID
 * @param userId - User who updated the item
 * @param previousData - Previous item data as JSON string
 * @param newData - New item data as JSON string
 * @returns Created AuditLog
 */
export function logItemUpdate(
  itemId: string,
  userId: string,
  previousData: string,
  newData: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'item',
    entityId: itemId,
    action: 'update',
    previousValue: previousData,
    newValue: newData,
    userId,
  });
}

/**
 * Log an item deletion
 * @param itemId - Item ID
 * @param userId - User who deleted the item
 * @param itemData - Item data as JSON string (for reference)
 * @returns Created AuditLog
 */
export function logItemDeletion(
  itemId: string,
  userId: string,
  itemData: string
): AuditLog {
  return auditLogRepository.createAuditLog({
    entityType: 'item',
    entityId: itemId,
    action: 'delete',
    previousValue: itemData,
    userId,
  });
}

/**
 * Get audit logs for a specific entity
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns Array of AuditLogs
 */
export function getAuditLogsForEntity(
  entityType: AuditLog['entityType'],
  entityId: string
): AuditLog[] {
  return auditLogRepository.getAuditLogsByEntity(entityType, entityId);
}

/**
 * Get audit logs for a specific user
 * @param userId - User ID
 * @returns Array of AuditLogs
 */
export function getAuditLogsForUser(userId: string): AuditLog[] {
  return auditLogRepository.getAuditLogsByUser(userId);
}

/**
 * Get audit logs within a date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Array of AuditLogs
 */
export function getAuditLogsByDateRange(startDate: string, endDate: string): AuditLog[] {
  return auditLogRepository.getAuditLogsByDateRange(startDate, endDate);
}

/**
 * Get all audit logs
 * @returns Array of all AuditLogs
 */
export function getAllAuditLogs(): AuditLog[] {
  return auditLogRepository.getAllAuditLogs();
}
