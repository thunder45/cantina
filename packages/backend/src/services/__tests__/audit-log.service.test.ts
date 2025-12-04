import * as auditLogService from '../audit-log.service';
import * as auditLogRepository from '../../repositories/audit-log.repository';

describe('Audit Log Service', () => {
  beforeEach(() => {
    auditLogRepository.resetRepository();
  });

  describe('logSaleCreation (Requirements: 17.1)', () => {
    it('should create audit log for sale creation', () => {
      const saleId = 'sale-123';
      const userId = 'user-456';
      const saleData = JSON.stringify({ total: 100, items: [] });

      const log = auditLogService.logSaleCreation(saleId, userId, saleData);

      expect(log.entityType).toBe('sale');
      expect(log.entityId).toBe(saleId);
      expect(log.action).toBe('create');
      expect(log.newValue).toBe(saleData);
      expect(log.userId).toBe(userId);
      expect(log.createdAt).toBeDefined();
    });
  });

  describe('logSaleRefund (Requirements: 17.1)', () => {
    it('should create audit log for sale refund', () => {
      const saleId = 'sale-123';
      const userId = 'user-456';
      const reason = 'Customer requested refund';

      const log = auditLogService.logSaleRefund(saleId, userId, reason);

      expect(log.entityType).toBe('sale');
      expect(log.entityId).toBe(saleId);
      expect(log.action).toBe('refund');
      expect(log.newValue).toBe(reason);
      expect(log.userId).toBe(userId);
    });
  });

  describe('logPaymentReceived (Requirements: 17.2)', () => {
    it('should create audit log for payment received', () => {
      const paymentId = 'payment-123';
      const customerId = 'customer-456';
      const userId = 'user-789';
      const paymentData = JSON.stringify({ amount: 50, method: 'cash' });

      const log = auditLogService.logPaymentReceived(paymentId, customerId, userId, paymentData);

      expect(log.entityType).toBe('payment');
      expect(log.entityId).toBe(paymentId);
      expect(log.action).toBe('create');
      expect(log.userId).toBe(userId);
      expect(log.newValue).toContain(customerId);
    });
  });


  describe('logPriceChange (Requirements: 17.3)', () => {
    it('should create audit log for price change', () => {
      const itemId = 'item-123';
      const userId = 'user-456';
      const previousPrice = 10.00;
      const newPrice = 12.50;

      const log = auditLogService.logPriceChange(itemId, userId, previousPrice, newPrice);

      expect(log.entityType).toBe('price');
      expect(log.entityId).toBe(itemId);
      expect(log.action).toBe('update');
      expect(log.previousValue).toBe('10');
      expect(log.newValue).toBe('12.5');
      expect(log.userId).toBe(userId);
    });
  });

  describe('logItemCreation', () => {
    it('should create audit log for item creation', () => {
      const itemId = 'item-123';
      const userId = 'user-456';
      const itemData = JSON.stringify({ description: 'Test Item', price: 10 });

      const log = auditLogService.logItemCreation(itemId, userId, itemData);

      expect(log.entityType).toBe('item');
      expect(log.entityId).toBe(itemId);
      expect(log.action).toBe('create');
      expect(log.newValue).toBe(itemData);
      expect(log.userId).toBe(userId);
    });
  });

  describe('logItemUpdate', () => {
    it('should create audit log for item update', () => {
      const itemId = 'item-123';
      const userId = 'user-456';
      const previousData = JSON.stringify({ description: 'Old Name', price: 10 });
      const newData = JSON.stringify({ description: 'New Name', price: 12 });

      const log = auditLogService.logItemUpdate(itemId, userId, previousData, newData);

      expect(log.entityType).toBe('item');
      expect(log.entityId).toBe(itemId);
      expect(log.action).toBe('update');
      expect(log.previousValue).toBe(previousData);
      expect(log.newValue).toBe(newData);
      expect(log.userId).toBe(userId);
    });
  });

  describe('logItemDeletion', () => {
    it('should create audit log for item deletion', () => {
      const itemId = 'item-123';
      const userId = 'user-456';
      const itemData = JSON.stringify({ description: 'Deleted Item', price: 10 });

      const log = auditLogService.logItemDeletion(itemId, userId, itemData);

      expect(log.entityType).toBe('item');
      expect(log.entityId).toBe(itemId);
      expect(log.action).toBe('delete');
      expect(log.previousValue).toBe(itemData);
      expect(log.userId).toBe(userId);
    });
  });

  describe('getAuditLogsForEntity', () => {
    it('should return audit logs for a specific entity', () => {
      const saleId = 'sale-123';
      const userId = 'user-456';

      auditLogService.logSaleCreation(saleId, userId, '{}');
      auditLogService.logSaleRefund(saleId, userId, 'reason');
      auditLogService.logSaleCreation('other-sale', userId, '{}');

      const logs = auditLogService.getAuditLogsForEntity('sale', saleId);

      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.entityId === saleId)).toBe(true);
    });
  });

  describe('getAuditLogsForUser', () => {
    it('should return audit logs for a specific user', () => {
      const userId = 'user-456';

      auditLogService.logSaleCreation('sale-1', userId, '{}');
      auditLogService.logPaymentReceived('payment-1', 'customer-1', userId, '{}');
      auditLogService.logSaleCreation('sale-2', 'other-user', '{}');

      const logs = auditLogService.getAuditLogsForUser(userId);

      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === userId)).toBe(true);
    });
  });

  describe('getAllAuditLogs', () => {
    it('should return all audit logs', () => {
      auditLogService.logSaleCreation('sale-1', 'user-1', '{}');
      auditLogService.logPaymentReceived('payment-1', 'customer-1', 'user-2', '{}');
      auditLogService.logPriceChange('item-1', 'user-3', 10, 15);

      const logs = auditLogService.getAllAuditLogs();

      expect(logs).toHaveLength(3);
    });

    it('should return logs sorted by creation date (newest first)', () => {
      auditLogService.logSaleCreation('sale-1', 'user-1', '{}');
      auditLogService.logSaleCreation('sale-2', 'user-1', '{}');
      auditLogService.logSaleCreation('sale-3', 'user-1', '{}');

      const logs = auditLogService.getAllAuditLogs();

      // Verify sorted by createdAt descending
      for (let i = 0; i < logs.length - 1; i++) {
        expect(new Date(logs[i].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(logs[i + 1].createdAt).getTime());
      }
    });
  });
});
