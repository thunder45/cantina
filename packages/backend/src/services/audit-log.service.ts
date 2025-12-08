import { AuditLog } from '@cantina-pos/shared';
import * as auditLogRepository from '../repositories/audit-log.repository';

/**
 * Audit Log Service - Requirements: 17.1, 17.2, 17.3
 */

export async function logSaleCreation(saleId: string, userId: string, saleData: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'sale', entityId: saleId, action: 'create', newValue: saleData, userId,
  });
}

export async function logSaleRefund(saleId: string, userId: string, reason: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'sale', entityId: saleId, action: 'refund', newValue: reason, userId,
  });
}

export async function logPaymentReceived(paymentId: string, customerId: string, userId: string, paymentData: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'payment', entityId: paymentId, action: 'create',
    newValue: JSON.stringify({ customerId, payment: paymentData }), userId,
  });
}

export async function logPriceChange(itemId: string, userId: string, previousPrice: number, newPrice: number): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'price', entityId: itemId, action: 'update',
    previousValue: previousPrice.toString(), newValue: newPrice.toString(), userId,
  });
}

export async function logItemCreation(itemId: string, userId: string, itemData: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'item', entityId: itemId, action: 'create', newValue: itemData, userId,
  });
}

export async function logItemUpdate(itemId: string, userId: string, previousData: string, newData: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'item', entityId: itemId, action: 'update',
    previousValue: previousData, newValue: newData, userId,
  });
}

export async function logItemDeletion(itemId: string, userId: string, itemData: string): Promise<AuditLog> {
  return auditLogRepository.createAuditLog({
    entityType: 'item', entityId: itemId, action: 'delete', previousValue: itemData, userId,
  });
}

export async function getAuditLogsForEntity(entityType: AuditLog['entityType'], entityId: string): Promise<AuditLog[]> {
  return auditLogRepository.getAuditLogsByEntity(entityType, entityId);
}

export async function getAuditLogsForUser(userId: string): Promise<AuditLog[]> {
  return auditLogRepository.getAuditLogsByUser(userId);
}

export async function getAuditLogsByDateRange(startDate: string, endDate: string): Promise<AuditLog[]> {
  return auditLogRepository.getAuditLogsByDateRange(startDate, endDate);
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  return auditLogRepository.getAllAuditLogs();
}
