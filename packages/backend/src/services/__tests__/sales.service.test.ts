import * as salesService from '../sales.service';
import * as orderService from '../order.service';
import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';
import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';
import * as auditLogRepository from '../../repositories/audit-log.repository';

describe('Sales Service', () => {
  let testEventId: string;
  let menuItemId: string;

  beforeEach(async () => {
    salesService.resetService();
    orderService.resetService();
    eventService.resetService();
    eventCategoryService.resetRepository();
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();
    auditLogRepository.resetRepository();

    await eventCategoryService.initializeDefaultCategories();
    const categories = await eventCategoryService.getCategories();
    const event = await eventService.createEvent({ categoryId: categories[0].id, name: 'Test', dates: ['2024-01-15'] });
    testEventId = event.id;

    const group = await menuGroupService.createGroup('Test Group');
    const catalogItem = await catalogItemService.createCatalogItem({ description: 'Test Item', suggestedPrice: 10.00, groupId: group.id });
    const menuItem = await menuItemService.addMenuItem(testEventId, { catalogItemId: catalogItem.id, description: 'Test Item', price: 10.00, stock: 100, groupId: group.id });
    menuItemId = menuItem.id;
  });

  describe('confirmSale', () => {
    it('should confirm a sale with cash payment', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');
      expect(sale.total).toBe(20);
      expect(sale.payments).toHaveLength(1);
      expect(sale.payments[0].method).toBe('cash');
    });

    it('should confirm a sale with mixed payment', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 3 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }, { method: 'card', amount: 10 }], 'user1');
      expect(sale.total).toBe(30);
      expect(sale.payments).toHaveLength(2);
    });

    it('should update menu item sold count', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 5 });
      await salesService.confirmSale(order.id, [{ method: 'cash', amount: 50 }], 'user1');
      const item = await menuItemService.getMenuItem(menuItemId);
      expect(item.soldCount).toBe(5);
    });

    it('should throw error for empty order', async () => {
      const order = await orderService.createOrder(testEventId);
      await expect(salesService.confirmSale(order.id, [{ method: 'cash', amount: 0 }], 'user1')).rejects.toThrow('ERR_ORDER_EMPTY');
    });

    it('should throw error for payment mismatch', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      await expect(salesService.confirmSale(order.id, [{ method: 'cash', amount: 10 }], 'user1')).rejects.toThrow('ERR_PAYMENT_MISMATCH');
    });

    it('should throw error for non-existent order', async () => {
      await expect(salesService.confirmSale('non-existent', [{ method: 'cash', amount: 10 }], 'user1')).rejects.toThrow('ERR_ORDER_NOT_FOUND');
    });
  });

  describe('getSale', () => {
    it('should return sale by ID', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 1 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 10 }], 'user1');
      const found = await salesService.getSale(sale.id);
      expect(found.id).toBe(sale.id);
    });

    it('should throw error for non-existent sale', async () => {
      await expect(salesService.getSale('non-existent')).rejects.toThrow('ERR_SALE_NOT_FOUND');
    });
  });

  describe('getSalesByEvent', () => {
    it('should return all sales for an event', async () => {
      const order1 = await orderService.createOrder(testEventId);
      await orderService.addItem(order1.id, { menuItemId, quantity: 1 });
      await salesService.confirmSale(order1.id, [{ method: 'cash', amount: 10 }], 'user1');

      const order2 = await orderService.createOrder(testEventId);
      await orderService.addItem(order2.id, { menuItemId, quantity: 2 });
      await salesService.confirmSale(order2.id, [{ method: 'card', amount: 20 }], 'user1');

      const sales = await salesService.getSalesByEvent(testEventId);
      expect(sales).toHaveLength(2);
    });
  });

  describe('refundSale', () => {
    it('should refund a sale', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');
      const refund = await salesService.refundSale(sale.id, 'Customer request', 'user1');
      expect(refund.saleId).toBe(sale.id);
      expect(refund.reason).toBe('Customer request');
    });

    it('should restore menu item stock on refund', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 5 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 50 }], 'user1');
      await salesService.refundSale(sale.id, 'Refund', 'user1');
      const item = await menuItemService.getMenuItem(menuItemId);
      expect(item.soldCount).toBe(0);
    });

    it('should throw error for already refunded sale', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 1 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 10 }], 'user1');
      await salesService.refundSale(sale.id, 'First refund', 'user1');
      await expect(salesService.refundSale(sale.id, 'Second refund', 'user1')).rejects.toThrow('ERR_SALE_ALREADY_REFUNDED');
    });

    it('should throw error for empty reason', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 1 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 10 }], 'user1');
      await expect(salesService.refundSale(sale.id, '   ', 'user1')).rejects.toThrow('ERR_EMPTY_REFUND_REASON');
    });
  });

  describe('getReceipt', () => {
    it('should generate receipt for sale', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');
      const receipt = await salesService.getReceipt(sale.id);
      expect(receipt.saleId).toBe(sale.id);
      expect(receipt.total).toBe(20);
      expect(receipt.items).toHaveLength(1);
    });
  });
});
