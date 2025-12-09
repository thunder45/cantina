import * as reportService from '../report.service';
import * as salesService from '../sales.service';
import * as orderService from '../order.service';
import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';
import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';

describe('Report Service', () => {
  let testEventId: string;
  let menuItemId: string;
  let testCategoryId: string;

  beforeEach(async () => {
    salesService.resetService();
    orderService.resetService();
    eventService.resetService();
    eventCategoryService.resetRepository();
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();

    await eventCategoryService.initializeDefaultCategories();
    const categories = await eventCategoryService.getCategories();
    testCategoryId = categories[0].id;
    const event = await eventService.createEvent({ categoryId: testCategoryId, name: 'Test', dates: ['2024-01-15'] });
    testEventId = event.id;

    const group = await menuGroupService.createGroup('Test Group');
    const catalogItem = await catalogItemService.createCatalogItem({ description: 'Test Item', suggestedPrice: 10.00, groupId: group.id });
    const menuItem = await menuItemService.addMenuItem(testEventId, { catalogItemId: catalogItem.id, description: 'Test Item', price: 10.00, stock: 100, groupId: group.id });
    menuItemId = menuItem.id;
  });

  describe('getEventReport', () => {
    it('should return report with zero values for event without sales', async () => {
      const report = await reportService.getEventReport(testEventId);
      expect(report.totalSales).toBe(0);
      expect(report.totalPaid).toBe(0);
    });

    it('should calculate totals correctly', async () => {
      const order1 = await orderService.createOrder(testEventId);
      await orderService.addItem(order1.id, { menuItemId, quantity: 2 });
      await salesService.confirmSale(order1.id, [{ method: 'cash', amount: 20 }], 'user1');

      const order2 = await orderService.createOrder(testEventId);
      await orderService.addItem(order2.id, { menuItemId, quantity: 3 });
      await salesService.confirmSale(order2.id, [{ method: 'card', amount: 30 }], 'user1');

      const report = await reportService.getEventReport(testEventId);
      expect(report.totalPaid).toBe(50);
    });

    it('should group sales by payment method', async () => {
      const order1 = await orderService.createOrder(testEventId);
      await orderService.addItem(order1.id, { menuItemId, quantity: 2 });
      await salesService.confirmSale(order1.id, [{ method: 'cash', amount: 20 }], 'user1');

      const order2 = await orderService.createOrder(testEventId);
      await orderService.addItem(order2.id, { menuItemId, quantity: 1 });
      await salesService.confirmSale(order2.id, [{ method: 'cash', amount: 10 }], 'user1');

      const report = await reportService.getEventReport(testEventId);
      const cashBreakdown = report.paymentBreakdown.find(p => p.method === 'cash');
      expect(cashBreakdown?.total).toBe(30);
    });

    it('should exclude refunded sales from totals', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const sale = await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');
      await salesService.refundSale(sale.id, 'Test refund', 'user1');

      const report = await reportService.getEventReport(testEventId);
      expect(report.totalRefunded).toBe(20);
    });

    it('should throw error for non-existent event', async () => {
      await expect(reportService.getEventReport('non-existent')).rejects.toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('getStockReport', () => {
    it('should return stock information for all menu items', async () => {
      const report = await reportService.getStockReport(testEventId);
      expect(report.items).toHaveLength(1);
      expect(report.items[0].initialStock).toBe(100);
      expect(report.items[0].sold).toBe(0);
    });

    it('should update after sales', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 10 });
      await salesService.confirmSale(order.id, [{ method: 'cash', amount: 100 }], 'user1');

      const report = await reportService.getStockReport(testEventId);
      expect(report.items[0].sold).toBe(10);
    });
  });

  describe('getCategoryReport', () => {
    it('should aggregate sales across events in category', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');

      const report = await reportService.getCategoryReport(testCategoryId);
      expect(report.eventCount).toBeGreaterThanOrEqual(1);
      expect(report.totalPaid).toBe(20);
    });

    it('should throw error for non-existent category', async () => {
      await expect(reportService.getCategoryReport('non-existent')).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('exportReportCSV', () => {
    it('should generate CSV with headers', async () => {
      const csv = await reportService.exportReportCSV(testEventId);
      expect(csv).toContain('Relatório');
    });

    it('should include sales data', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      await salesService.confirmSale(order.id, [{ method: 'cash', amount: 20 }], 'user1');

      const csv = await reportService.exportReportCSV(testEventId);
      expect(csv).toContain('20');
    });
  });
});
