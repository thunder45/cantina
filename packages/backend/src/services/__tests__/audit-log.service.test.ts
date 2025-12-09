import * as auditLogService from '../audit-log.service';
import * as auditLogRepository from '../../repositories/audit-log.repository';

describe('Audit Log Service', () => {
  beforeEach(() => {
    auditLogRepository.resetRepository();
  });

  describe('logSaleCreation', () => {
    it('should create audit log for sale creation', async () => {
      const log = await auditLogService.logSaleCreation('sale-123', 'user-456', '{"total":100}');
      expect(log.entityType).toBe('sale');
      expect(log.entityId).toBe('sale-123');
      expect(log.action).toBe('create');
    });
  });

  describe('logSaleRefund', () => {
    it('should create audit log for sale refund', async () => {
      const log = await auditLogService.logSaleRefund('sale-123', 'user-456', 'Customer requested');
      expect(log.entityType).toBe('sale');
      expect(log.action).toBe('refund');
    });
  });

  describe('logPaymentReceived', () => {
    it('should create audit log for payment received', async () => {
      const log = await auditLogService.logPaymentReceived('pay-123', 'cust-456', 'user-789', '{"amount":50}');
      expect(log.entityType).toBe('payment');
      expect(log.action).toBe('create');
    });
  });

  describe('logPriceChange', () => {
    it('should create audit log for price change', async () => {
      const log = await auditLogService.logPriceChange('item-123', 'user-456', 10.00, 12.50);
      expect(log.entityType).toBe('price');
      expect(log.action).toBe('update');
      expect(log.previousValue).toBe('10');
      expect(log.newValue).toBe('12.5');
    });
  });

  describe('logItemCreation', () => {
    it('should create audit log for item creation', async () => {
      const log = await auditLogService.logItemCreation('item-123', 'user-456', '{"desc":"Test"}');
      expect(log.entityType).toBe('item');
      expect(log.action).toBe('create');
    });
  });

  describe('logItemUpdate', () => {
    it('should create audit log for item update', async () => {
      const log = await auditLogService.logItemUpdate('item-123', 'user-456', '{"old":1}', '{"new":2}');
      expect(log.entityType).toBe('item');
      expect(log.action).toBe('update');
    });
  });

  describe('logItemDeletion', () => {
    it('should create audit log for item deletion', async () => {
      const log = await auditLogService.logItemDeletion('item-123', 'user-456', '{"deleted":true}');
      expect(log.entityType).toBe('item');
      expect(log.action).toBe('delete');
    });
  });

  describe('getAuditLogsForEntity', () => {
    it('should return audit logs for a specific entity', async () => {
      await auditLogService.logSaleCreation('sale-123', 'user-456', '{}');
      await auditLogService.logSaleRefund('sale-123', 'user-456', 'reason');
      await auditLogService.logSaleCreation('other-sale', 'user-456', '{}');

      const logs = await auditLogService.getAuditLogsForEntity('sale', 'sale-123');
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.entityId === 'sale-123')).toBe(true);
    });
  });

  describe('getAuditLogsForUser', () => {
    it('should return audit logs for a specific user', async () => {
      await auditLogService.logSaleCreation('sale-1', 'user-456', '{}');
      await auditLogService.logPaymentReceived('pay-1', 'cust-1', 'user-456', '{}');
      await auditLogService.logSaleCreation('sale-2', 'other-user', '{}');

      const logs = await auditLogService.getAuditLogsForUser('user-456');
      expect(logs).toHaveLength(2);
    });
  });

  describe('getAllAuditLogs', () => {
    it('should return all audit logs', async () => {
      await auditLogService.logSaleCreation('sale-1', 'user-1', '{}');
      await auditLogService.logPaymentReceived('pay-1', 'cust-1', 'user-2', '{}');
      await auditLogService.logPriceChange('item-1', 'user-3', 10, 15);

      const logs = await auditLogService.getAllAuditLogs();
      expect(logs).toHaveLength(3);
    });
  });
});
