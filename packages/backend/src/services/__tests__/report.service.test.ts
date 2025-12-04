import * as reportService from '../report.service';
import * as eventRepository from '../../repositories/event.repository';
import * as menuItemRepository from '../../repositories/menu-item.repository';
import * as saleRepository from '../../repositories/sale.repository';
import * as orderRepository from '../../repositories/order.repository';

describe('ReportService', () => {
  beforeEach(() => {
    eventRepository.resetRepository();
    menuItemRepository.resetRepository();
    saleRepository.resetRepository();
    orderRepository.resetRepository();
  });

  describe('getEventReport', () => {
    it('should return empty report for event with no sales', () => {
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food', 'Drinks'] });
      
      expect(() => reportService.getEventReport(event.id, { category: 'InvalidCategory' }))
        .toThrow('ERR_INVALID_CATEGORY');
    });

    it('should accept valid category filter (Req 10.2)', () => {
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food', 'Drinks'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
      expect(() => reportService.getEventReport(event.id, { startDate: 'invalid-date' }))
        .toThrow('ERR_INVALID_DATE_FORMAT');
    });

    it('should throw error for invalid date range (Req 10.4)', () => {
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
      expect(() => reportService.getEventReport(event.id, { 
        startDate: '2024-12-31', 
        endDate: '2024-01-01' 
      })).toThrow('ERR_INVALID_DATE_RANGE');
    });
  });

  describe('getStockReport', () => {
    it('should return stock report for event', () => {
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Festa Junina', dates: ['2024-06-15'], categories: ['Food'] });
      
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
      const event = eventRepository.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      
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
      const event1 = eventRepository.createEvent({ name: 'Event 1', dates: ['2024-01-15'], categories: ['Food'] });
      const event2 = eventRepository.createEvent({ name: 'Event 2', dates: ['2024-01-20'], categories: ['Food'] });
      
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
});
