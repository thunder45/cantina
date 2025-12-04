import * as salesService from '../sales.service';
import * as orderService from '../order.service';
import * as eventService from '../event.service';
import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';
import * as auditLogService from '../audit-log.service';
import * as auditLogRepository from '../../repositories/audit-log.repository';

describe('Sales Service', () => {
  let testEventId: string;
  let testGroupId: string;
  let menuItemId: string;
  let catalogItemId: string;

  beforeEach(() => {
    // Reset all services
    salesService.resetService();
    orderService.resetService();
    eventService.resetService();
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();

    // Create test event
    const event = eventService.createEvent({
      name: 'Test Event',
      dates: ['2024-01-15'],
      categories: ['test'],
    });
    testEventId = event.id;

    // Create test group
    const group = menuGroupService.createGroup('Test Group');
    testGroupId = group.id;
    
    // Create test catalog item
    const catalogItem = catalogItemService.createCatalogItem({
      description: 'Test Catalog Item',
      suggestedPrice: 10.00,
      groupId: group.id,
    });
    catalogItemId = catalogItem.id;
    
    // Create test menu item with finite stock
    const menuItem = menuItemService.addMenuItem(testEventId, {
      catalogItemId: catalogItem.id,
      description: 'Test Item',
      price: 10.00,
      stock: 100,
      groupId: group.id,
    });
    menuItemId = menuItem.id;
  });

  afterEach(() => {
    salesService.resetService();
    orderService.resetService();
    eventService.resetService();
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();
    auditLogRepository.resetRepository();
  });

  describe('confirmSale', () => {
    it('should confirm a sale with cash payment', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      expect(sale).toBeDefined();
      expect(sale.id).toBeDefined();
      expect(sale.eventId).toBe(testEventId);
      expect(sale.orderId).toBe(order.id);
      expect(sale.items).toHaveLength(1);
      expect(sale.total).toBe(20.00);
      expect(sale.payments).toHaveLength(1);
      expect(sale.payments[0].method).toBe('cash');
      expect(sale.isPaid).toBe(true);
      expect(sale.isRefunded).toBe(false);
      expect(sale.createdBy).toBe('test-user');
    });

    it('should confirm a sale with card payment', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 });

      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'card', amount: 30.00 }],
        'test-user'
      );

      expect(sale.payments[0].method).toBe('card');
      expect(sale.isPaid).toBe(true);
    });

    it('should confirm a sale with mixed payment (Requirements: 7.3)', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 5 });

      const sale = salesService.confirmSale(
        order.id,
        [
          { method: 'cash', amount: 30.00 },
          { method: 'card', amount: 20.00 },
        ],
        'test-user'
      );

      expect(sale.payments).toHaveLength(2);
      expect(sale.total).toBe(50.00);
      expect(sale.isPaid).toBe(true);
    });

    it('should confirm a credit sale with customer (Requirements: 8.4)', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'credit', amount: 20.00 }],
        'test-user',
        'customer-123'
      );

      expect(sale.customerId).toBe('customer-123');
      expect(sale.isPaid).toBe(false); // Credit sales are not paid
    });

    it('should mark mixed payment with credit as unpaid', () => {
      // When a payment includes ANY credit portion, the sale is considered unpaid
      // because the credit portion represents debt that needs to be collected later
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 });

      const sale = salesService.confirmSale(
        order.id,
        [
          { method: 'cash', amount: 20.00 },
          { method: 'credit', amount: 10.00 },
        ],
        'test-user',
        'customer-123'
      );

      expect(sale.payments).toHaveLength(2);
      expect(sale.total).toBe(30.00);
      expect(sale.isPaid).toBe(false); // Any credit = unpaid
      expect(sale.customerId).toBe('customer-123');
      expect(sale.isPaid).toBe(false); // Credit sales are not paid
    });

    it('should decrement stock on sale confirmation (Requirements: 6.1)', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 5 });

      const initialStock = menuItemService.getAvailableStock(menuItemId);
      
      salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 50.00 }],
        'test-user'
      );

      const finalStock = menuItemService.getAvailableStock(menuItemId);
      expect(finalStock).toBe(initialStock - 5);
    });

    it('should throw error for payment mismatch', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      expect(() => salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 15.00 }], // Wrong amount
        'test-user'
      )).toThrow('ERR_PAYMENT_MISMATCH');
    });

    it('should throw error for credit sale without customer', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      expect(() => salesService.confirmSale(
        order.id,
        [{ method: 'credit', amount: 20.00 }],
        'test-user'
        // No customerId
      )).toThrow('ERR_CUSTOMER_REQUIRED_FOR_CREDIT');
    });

    it('should throw error for empty order', () => {
      const order = orderService.createOrder(testEventId);

      expect(() => salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 0 }],
        'test-user'
      )).toThrow('ERR_ORDER_EMPTY');
    });

    it('should throw error for non-existent order', () => {
      expect(() => salesService.confirmSale(
        'non-existent',
        [{ method: 'cash', amount: 10.00 }],
        'test-user'
      )).toThrow('ERR_ORDER_NOT_FOUND');
    });

    it('should throw error for no payment', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      expect(() => salesService.confirmSale(
        order.id,
        [],
        'test-user'
      )).toThrow('ERR_NO_PAYMENT');
    });
  });

  describe('getSale', () => {
    it('should return an existing sale', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const created = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      const retrieved = salesService.getSale(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should throw error for non-existent sale', () => {
      expect(() => salesService.getSale('non-existent')).toThrow('ERR_SALE_NOT_FOUND');
    });
  });

  describe('getSalesByEvent', () => {
    it('should return sales for an event', () => {
      // Create two sales
      const order1 = orderService.createOrder(testEventId);
      orderService.addItem(order1.id, { menuItemId, quantity: 1 });
      salesService.confirmSale(order1.id, [{ method: 'cash', amount: 10.00 }], 'user1');

      const order2 = orderService.createOrder(testEventId);
      orderService.addItem(order2.id, { menuItemId, quantity: 2 });
      salesService.confirmSale(order2.id, [{ method: 'card', amount: 20.00 }], 'user2');

      const sales = salesService.getSalesByEvent(testEventId);
      expect(sales).toHaveLength(2);
    });
  });

  describe('getSalesByCustomer', () => {
    it('should return sales for a customer', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      salesService.confirmSale(
        order.id,
        [{ method: 'credit', amount: 20.00 }],
        'test-user',
        'customer-123'
      );

      const sales = salesService.getSalesByCustomer('customer-123');
      expect(sales).toHaveLength(1);
      expect(sales[0].customerId).toBe('customer-123');
    });
  });

  describe('refundSale', () => {
    it('should refund a sale and restore stock (Requirements: 14.1)', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 5 });
      
      const stockBeforeSale = menuItemService.getAvailableStock(menuItemId);
      
      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 50.00 }],
        'test-user'
      );

      const stockAfterSale = menuItemService.getAvailableStock(menuItemId);
      expect(stockAfterSale).toBe(stockBeforeSale - 5);

      const refund = salesService.refundSale(sale.id, 'Customer request', 'admin-user');

      expect(refund).toBeDefined();
      expect(refund.saleId).toBe(sale.id);
      expect(refund.reason).toBe('Customer request');
      expect(refund.createdBy).toBe('admin-user');

      // Check stock was restored
      const stockAfterRefund = menuItemService.getAvailableStock(menuItemId);
      expect(stockAfterRefund).toBe(stockBeforeSale);

      // Check sale is marked as refunded
      const refundedSale = salesService.getSale(sale.id);
      expect(refundedSale.isRefunded).toBe(true);
      expect(refundedSale.refundReason).toBe('Customer request');
    });

    it('should throw error for already refunded sale', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      salesService.refundSale(sale.id, 'First refund', 'admin');

      expect(() => salesService.refundSale(sale.id, 'Second refund', 'admin'))
        .toThrow('ERR_SALE_ALREADY_REFUNDED');
    });

    it('should throw error for non-existent sale', () => {
      expect(() => salesService.refundSale('non-existent', 'Reason', 'admin'))
        .toThrow('ERR_SALE_NOT_FOUND');
    });

    it('should throw error for empty refund reason', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      expect(() => salesService.refundSale(sale.id, '', 'admin'))
        .toThrow('ERR_EMPTY_REFUND_REASON');
    });
  });

  describe('getReceipt', () => {
    it('should return receipt for a sale (Requirements: 16.1)', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 });
      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 30.00 }],
        'test-user'
      );

      const receipt = salesService.getReceipt(sale.id);

      expect(receipt.saleId).toBe(sale.id);
      expect(receipt.eventName).toBe('Test Event');
      expect(receipt.items).toHaveLength(1);
      expect(receipt.items[0].description).toBe('Test Item');
      expect(receipt.items[0].quantity).toBe(3);
      expect(receipt.items[0].unitPrice).toBe(10.00);
      expect(receipt.items[0].total).toBe(30.00);
      expect(receipt.total).toBe(30.00);
      expect(receipt.payments).toHaveLength(1);
      expect(receipt.createdBy).toBe('test-user');
    });

    it('should throw error for non-existent sale', () => {
      expect(() => salesService.getReceipt('non-existent'))
        .toThrow('ERR_SALE_NOT_FOUND');
    });
  });

  describe('stock exhaustion', () => {
    it('should mark item as unavailable when stock is exhausted (Requirements: 6.2)', () => {
      // Create item with limited stock
      const limitedCatalog = catalogItemService.createCatalogItem({
        description: 'Limited Item',
        suggestedPrice: 5.00,
        groupId: testGroupId,
      });
      
      const limitedItem = menuItemService.addMenuItem(testEventId, {
        catalogItemId: limitedCatalog.id,
        description: 'Limited Item',
        price: 5.00,
        stock: 3,
        groupId: testGroupId,
      });

      expect(menuItemService.isMenuItemAvailable(limitedItem.id)).toBe(true);

      // Sell all stock
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId: limitedItem.id, quantity: 3 });
      salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 15.00 }],
        'test-user'
      );

      expect(menuItemService.isMenuItemAvailable(limitedItem.id)).toBe(false);
    });
  });

  describe('infinite stock handling', () => {
    it('should not affect availability for infinite stock items', () => {
      const infiniteCatalog = catalogItemService.createCatalogItem({
        description: 'Infinite Item',
        suggestedPrice: 5.00,
        groupId: testGroupId,
      });

      const infiniteItem = menuItemService.addMenuItem(testEventId, {
        catalogItemId: infiniteCatalog.id,
        description: 'Infinite Item',
        price: 5.00,
        stock: 0, // 0 = infinite
        groupId: testGroupId,
      });

      // Sell large quantity
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId: infiniteItem.id, quantity: 1000 });
      salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 5000.00 }],
        'test-user'
      );

      // Should still be available
      expect(menuItemService.isMenuItemAvailable(infiniteItem.id)).toBe(true);
    });
  });

  describe('Audit Log Integration (Requirements: 17.1)', () => {
    beforeEach(() => {
      auditLogRepository.resetRepository();
    });

    it('should create audit log when sale is confirmed', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      const logs = auditLogService.getAuditLogsForEntity('sale', sale.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('create');
      expect(logs[0].userId).toBe('test-user');
    });

    it('should create audit log when sale is refunded', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = salesService.confirmSale(
        order.id,
        [{ method: 'cash', amount: 20.00 }],
        'test-user'
      );

      salesService.refundSale(sale.id, 'Customer request', 'admin-user');

      const logs = auditLogService.getAuditLogsForEntity('sale', sale.id);
      expect(logs).toHaveLength(2); // create + refund

      // Find the refund log (order may vary due to same-millisecond creation)
      const refundLog = logs.find(log => log.action === 'refund');
      expect(refundLog).toBeDefined();
      expect(refundLog!.userId).toBe('admin-user');
      expect(refundLog!.newValue).toBe('Customer request');
    });
  });
});
