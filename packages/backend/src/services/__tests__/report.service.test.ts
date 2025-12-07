import * as reportService from '../report.service';
import * as eventRepository from '../../repositories/event.repository';
import * as eventCategoryRepository from '../../repositories/event-category.repository';
import * as menuItemRepository from '../../repositories/menu-item.repository';
import * as saleRepository from '../../repositories/sale.repository';
import * as orderRepository from '../../repositories/order.repository';

describe('ReportService', () => {
  let testCategoryId: string;

  beforeEach(() => {
    eventRepository.resetRepository();
    eventCategoryRepository.resetRepository();
    menuItemRepository.resetRepository();
    saleRepository.resetRepository();
    orderRepository.resetRepository();

    // Initialize default categories
    eventCategoryRepository.initializeDefaultCategories();
    const categories = eventCategoryRepository.getCategories();
    testCategoryId = categories[0].id;
  });

  describe('getEventReport', () => {
    it('should return empty report for event with no sales', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      const report = reportService.getEventReport(event.id);
      
      expect(report.eventId).toBe(event.id);
      expect(report.totalSales).toBe(0);
      expect(report.totalPaid).toBe(0);
      expect(report.totalPending).toBe(0);
      expect(report.totalRefunded).toBe(0);
      expect(report.itemsSold).toHaveLength(0);
      expect(report.paymentBreakdown).toHaveLength(0);
    });

    it('should aggregate sales correctly', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      // Create menu items
      const item1 = menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat1',
        description: 'Pizza',
        price: 10,
        stock: 100,
        groupId: 'group1',
      });

      
      const item2 = menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat2',
        description: 'Soda',
        price: 3,
        stock: 50,
        groupId: 'group2',
      });
      
      // Create sales
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: item1.id, description: 'Pizza', price: 10, quantity: 2 }],
        20,
        [{ method: 'cash', amount: 20 }],
        'user1'
      );
      
      saleRepository.createSale(
        event.id,
        'order2',
        [
          { menuItemId: item1.id, description: 'Pizza', price: 10, quantity: 1 },
          { menuItemId: item2.id, description: 'Soda', price: 3, quantity: 2 },
        ],
        16,
        [{ method: 'card', amount: 16 }],
        'user1'
      );
      
      const report = reportService.getEventReport(event.id);
      
      expect(report.totalSales).toBe(36);
      expect(report.totalPaid).toBe(36);
      expect(report.totalPending).toBe(0);
      expect(report.itemsSold).toHaveLength(2);
      
      const pizzaSold = report.itemsSold.find(i => i.description === 'Pizza');
      expect(pizzaSold?.quantity).toBe(3);
      expect(pizzaSold?.total).toBe(30);
      
      const sodaSold = report.itemsSold.find(i => i.description === 'Soda');
      expect(sodaSold?.quantity).toBe(2);
      expect(sodaSold?.total).toBe(6);
    });

    it('should separate paid and pending amounts', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      // Paid sale
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 50, quantity: 1 }],
        50,
        [{ method: 'cash', amount: 50 }],
        'user1'
      );
      
      // Credit sale (pending)
      saleRepository.createSale(
        event.id,
        'order2',
        [{ menuItemId: 'item1', description: 'Item', price: 30, quantity: 1 }],
        30,
        [{ method: 'credit', amount: 30 }],
        'user1',
        'customer1'
      );
      
      const report = reportService.getEventReport(event.id);
      
      expect(report.totalSales).toBe(80);
      expect(report.totalPaid).toBe(50);
      expect(report.totalPending).toBe(30);
    });

    it('should track refunded amounts separately', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      // Create and refund a sale
      const sale = saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 25, quantity: 1 }],
        25,
        [{ method: 'cash', amount: 25 }],
        'user1'
      );
      
      saleRepository.refundSale(sale.id, 'Customer request', 'user1');
      
      // Non-refunded sale
      saleRepository.createSale(
        event.id,
        'order2',
        [{ menuItemId: 'item1', description: 'Item', price: 40, quantity: 1 }],
        40,
        [{ method: 'card', amount: 40 }],
        'user1'
      );
      
      const report = reportService.getEventReport(event.id);
      
      expect(report.totalSales).toBe(40);
      expect(report.totalRefunded).toBe(25);
    });

    it('should aggregate payment methods correctly', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 100, quantity: 1 }],
        100,
        [
          { method: 'cash', amount: 50 },
          { method: 'card', amount: 50 },
        ],
        'user1'
      );
      
      saleRepository.createSale(
        event.id,
        'order2',
        [{ menuItemId: 'item1', description: 'Item', price: 30, quantity: 1 }],
        30,
        [{ method: 'cash', amount: 30 }],
        'user1'
      );
      
      const report = reportService.getEventReport(event.id);
      
      const cashPayment = report.paymentBreakdown.find(p => p.method === 'cash');
      const cardPayment = report.paymentBreakdown.find(p => p.method === 'card');
      
      expect(cashPayment?.total).toBe(80);
      expect(cardPayment?.total).toBe(50);
    });

    it('should throw error for non-existent event', () => {
      expect(() => reportService.getEventReport('non-existent')).toThrow('ERR_EVENT_NOT_FOUND');
    });

    it('should throw error for invalid category filter (Req 10.2)', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'], categories: ['Food', 'Drinks'] });
      
      expect(() => reportService.getEventReport(event.id, { category: 'InvalidCategory' }))
        .toThrow('ERR_INVALID_CATEGORY');
    });

    it('should accept valid category filter (Req 10.2)', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'], categories: ['Food', 'Drinks'] });
      
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 10, quantity: 1 }],
        10,
        [{ method: 'cash', amount: 10 }],
        'user1'
      );
      
      const report = reportService.getEventReport(event.id, { category: 'Food' });
      
      expect(report.totalSales).toBe(10);
    });

    it('should throw error for invalid date format in filter (Req 10.4)', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      expect(() => reportService.getEventReport(event.id, { startDate: 'invalid-date' }))
        .toThrow('ERR_INVALID_DATE_FORMAT');
    });

    it('should throw error for invalid date range (Req 10.4)', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      expect(() => reportService.getEventReport(event.id, { 
        startDate: '2024-12-31', 
        endDate: '2024-01-01' 
      })).toThrow('ERR_INVALID_DATE_RANGE');
    });
  });

  describe('getStockReport', () => {
    it('should return stock report for event', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat1',
        description: 'Pizza',
        price: 10,
        stock: 50,
        groupId: 'group1',
      });
      
      menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat2',
        description: 'Soda',
        price: 3,
        stock: 0, // Infinite
        groupId: 'group2',
      });
      
      const report = reportService.getStockReport(event.id);
      
      expect(report.eventId).toBe(event.id);
      expect(report.items).toHaveLength(2);
      
      const pizza = report.items.find(i => i.description === 'Pizza');
      expect(pizza?.initialStock).toBe(50);
      expect(pizza?.sold).toBe(0);
      expect(pizza?.available).toBe(50);
      expect(pizza?.isInfinite).toBe(false);
      
      const soda = report.items.find(i => i.description === 'Soda');
      expect(soda?.isInfinite).toBe(true);
    });

    it('should reflect sold quantities', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      const item = menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat1',
        description: 'Pizza',
        price: 10,
        stock: 50,
        groupId: 'group1',
      });
      
      // Simulate sales
      menuItemRepository.incrementSoldCount(item.id, 15);
      
      const report = reportService.getStockReport(event.id);
      
      const pizza = report.items.find(i => i.description === 'Pizza');
      expect(pizza?.initialStock).toBe(50);
      expect(pizza?.sold).toBe(15);
      expect(pizza?.available).toBe(35);
    });

    it('should throw error for non-existent event', () => {
      expect(() => reportService.getStockReport('non-existent')).toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('exportReportCSV', () => {
    it('should generate CSV with all sections', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Festa Junina', dates: ['2024-06-15'] });
      
      menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat1',
        description: 'Cachorro Quente',
        price: 8,
        stock: 100,
        groupId: 'group1',
      });
      
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Cachorro Quente', price: 8, quantity: 5 }],
        40,
        [{ method: 'cash', amount: 40 }],
        'user1'
      );
      
      const csv = reportService.exportReportCSV(event.id);
      
      expect(csv).toContain('Relatório de Vendas - Festa Junina');
      expect(csv).toContain('RESUMO');
      expect(csv).toContain('Total de Vendas,€40.00');
      expect(csv).toContain('ITENS VENDIDOS');
      expect(csv).toContain('"Cachorro Quente",5,€40.00');
      expect(csv).toContain('FORMAS DE PAGAMENTO');
      expect(csv).toContain('Dinheiro,€40.00');
      expect(csv).toContain('RELATÓRIO DE ESTOQUE');
    });

    it('should throw error for non-existent event', () => {
      expect(() => reportService.exportReportCSV('non-existent')).toThrow('ERR_EVENT_NOT_FOUND');
    });

    it('should escape quotes in descriptions for valid CSV', () => {
      const event = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Test Event', dates: ['2024-01-01'] });
      
      menuItemRepository.addMenuItem(event.id, {
        catalogItemId: 'cat1',
        description: 'Pizza "Especial"',
        price: 15,
        stock: 50,
        groupId: 'group1',
      });
      
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Pizza "Especial"', price: 15, quantity: 2 }],
        30,
        [{ method: 'cash', amount: 30 }],
        'user1'
      );
      
      const csv = reportService.exportReportCSV(event.id);
      
      // CSV standard: quotes inside quoted strings are doubled
      expect(csv).toContain('"Pizza ""Especial"""');
    });
  });

  describe('getReportByPeriod', () => {
    it('should aggregate reports across multiple events', () => {
      const event1 = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Event 1', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: testCategoryId, name: 'Event 2', dates: ['2024-01-20'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item A', price: 10, quantity: 1 }],
        10,
        [{ method: 'cash', amount: 10 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item B', price: 20, quantity: 1 }],
        20,
        [{ method: 'card', amount: 20 }],
        'user1'
      );
      
      // Use a wide date range that includes current date
      const now = new Date();
      const startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString();
      const endDate = new Date(now.getFullYear() + 1, 11, 31).toISOString();
      
      const report = reportService.getReportByPeriod(startDate, endDate);
      
      expect(report.eventId).toBe('all');
      expect(report.totalSales).toBe(30);
      expect(report.itemsSold).toHaveLength(2);
    });
  });

  describe('getCategoryReport (Requirements: 11.2)', () => {
    it('should return empty report for category with no events', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Empty Category' });
      
      const report = reportService.getCategoryReport(category.id);
      
      expect(report.categoryId).toBe(category.id);
      expect(report.categoryName).toBe('Empty Category');
      expect(report.eventCount).toBe(0);
      expect(report.totalSales).toBe(0);
      expect(report.totalPaid).toBe(0);
      expect(report.totalPending).toBe(0);
      expect(report.totalRefunded).toBe(0);
      expect(report.eventBreakdown).toHaveLength(0);
      expect(report.paymentBreakdown).toHaveLength(0);
    });

    it('should aggregate data from all events in category', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Test Category' });
      
      const event1 = eventRepository.createEvent({ categoryId: category.id, name: 'Event 1', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: category.id, name: 'Event 2', dates: ['2024-01-20'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item A', price: 100, quantity: 1 }],
        100,
        [{ method: 'cash', amount: 100 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item B', price: 50, quantity: 2 }],
        100,
        [{ method: 'card', amount: 100 }],
        'user1'
      );
      
      const report = reportService.getCategoryReport(category.id);
      
      expect(report.categoryId).toBe(category.id);
      expect(report.categoryName).toBe('Test Category');
      expect(report.eventCount).toBe(2);
      expect(report.totalSales).toBe(200);
      expect(report.totalPaid).toBe(200);
      expect(report.eventBreakdown).toHaveLength(2);
      expect(report.paymentBreakdown).toHaveLength(2);
    });

    it('should include event breakdown with totals', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Test Category' });
      
      const event1 = eventRepository.createEvent({ categoryId: category.id, name: 'Culto Domingo', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: category.id, name: 'Culto Quarta', dates: ['2024-01-17'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 150, quantity: 1 }],
        150,
        [{ method: 'cash', amount: 150 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item', price: 75, quantity: 1 }],
        75,
        [{ method: 'cash', amount: 75 }],
        'user1'
      );
      
      const report = reportService.getCategoryReport(category.id);
      
      const event1Breakdown = report.eventBreakdown.find((e: { eventId: string }) => e.eventId === event1.id);
      const event2Breakdown = report.eventBreakdown.find((e: { eventId: string }) => e.eventId === event2.id);
      
      expect(event1Breakdown?.eventName).toBe('Culto Domingo');
      expect(event1Breakdown?.total).toBe(150);
      expect(event2Breakdown?.eventName).toBe('Culto Quarta');
      expect(event2Breakdown?.total).toBe(75);
    });

    it('should separate paid, pending and refunded amounts', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Test Category' });
      const event = eventRepository.createEvent({ categoryId: category.id, name: 'Event', dates: ['2024-01-15'] });
      
      // Paid sale
      saleRepository.createSale(
        event.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 100, quantity: 1 }],
        100,
        [{ method: 'cash', amount: 100 }],
        'user1'
      );
      
      // Credit sale (pending)
      saleRepository.createSale(
        event.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item', price: 50, quantity: 1 }],
        50,
        [{ method: 'credit', amount: 50 }],
        'user1',
        'customer1'
      );
      
      // Refunded sale
      const refundedSale = saleRepository.createSale(
        event.id,
        'order3',
        [{ menuItemId: 'item3', description: 'Item', price: 25, quantity: 1 }],
        25,
        [{ method: 'cash', amount: 25 }],
        'user1'
      );
      saleRepository.refundSale(refundedSale.id, 'Test refund', 'user1');
      
      const report = reportService.getCategoryReport(category.id);
      
      expect(report.totalSales).toBe(150);
      expect(report.totalPaid).toBe(100);
      expect(report.totalPending).toBe(50);
      expect(report.totalRefunded).toBe(25);
    });

    it('should aggregate payment methods across events', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Test Category' });
      
      const event1 = eventRepository.createEvent({ categoryId: category.id, name: 'Event 1', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: category.id, name: 'Event 2', dates: ['2024-01-20'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 100, quantity: 1 }],
        100,
        [{ method: 'cash', amount: 60 }, { method: 'card', amount: 40 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item', price: 80, quantity: 1 }],
        80,
        [{ method: 'cash', amount: 80 }],
        'user1'
      );
      
      const report = reportService.getCategoryReport(category.id);
      
      const cashPayment = report.paymentBreakdown.find((p: { method: string }) => p.method === 'cash');
      const cardPayment = report.paymentBreakdown.find((p: { method: string }) => p.method === 'card');
      
      expect(cashPayment?.total).toBe(140);
      expect(cardPayment?.total).toBe(40);
    });

    it('should throw error for non-existent category', () => {
      expect(() => reportService.getCategoryReport('non-existent')).toThrow('ERR_CATEGORY_NOT_FOUND');
    });

    it('should only include events from the specified category', () => {
      const category1 = eventCategoryRepository.createCategory({ name: 'Category 1' });
      const category2 = eventCategoryRepository.createCategory({ name: 'Category 2' });
      
      const event1 = eventRepository.createEvent({ categoryId: category1.id, name: 'Event Cat1', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: category2.id, name: 'Event Cat2', dates: ['2024-01-20'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Item', price: 100, quantity: 1 }],
        100,
        [{ method: 'cash', amount: 100 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Item', price: 200, quantity: 1 }],
        200,
        [{ method: 'cash', amount: 200 }],
        'user1'
      );
      
      const report1 = reportService.getCategoryReport(category1.id);
      const report2 = reportService.getCategoryReport(category2.id);
      
      expect(report1.totalSales).toBe(100);
      expect(report1.eventCount).toBe(1);
      expect(report2.totalSales).toBe(200);
      expect(report2.eventCount).toBe(1);
    });
  });

  describe('exportCategoryReportCSV (Requirements: 11.6)', () => {
    it('should generate CSV with all sections', () => {
      const category = eventCategoryRepository.createCategory({ name: 'Culto' });
      
      const event1 = eventRepository.createEvent({ categoryId: category.id, name: 'Culto Domingo', dates: ['2024-01-15'] });
      const event2 = eventRepository.createEvent({ categoryId: category.id, name: 'Culto Quarta', dates: ['2024-01-17'] });
      
      saleRepository.createSale(
        event1.id,
        'order1',
        [{ menuItemId: 'item1', description: 'Café', price: 5, quantity: 10 }],
        50,
        [{ method: 'cash', amount: 50 }],
        'user1'
      );
      
      saleRepository.createSale(
        event2.id,
        'order2',
        [{ menuItemId: 'item2', description: 'Bolo', price: 8, quantity: 5 }],
        40,
        [{ method: 'card', amount: 40 }],
        'user1'
      );
      
      const csv = reportService.exportCategoryReportCSV(category.id);
      
      expect(csv).toContain('Relatório de Categoria - Culto');
      expect(csv).toContain('Total de Eventos: 2');
      expect(csv).toContain('RESUMO');
      expect(csv).toContain('Total de Vendas,€90.00');
      expect(csv).toContain('EVENTOS');
      expect(csv).toContain('"Culto Domingo",€50.00');
      expect(csv).toContain('"Culto Quarta",€40.00');
      expect(csv).toContain('FORMAS DE PAGAMENTO');
      expect(csv).toContain('Dinheiro,€50.00');
      expect(csv).toContain('Cartão,€40.00');
    });

    it('should throw error for non-existent category', () => {
      expect(() => reportService.exportCategoryReportCSV('non-existent')).toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });
});
