import * as customerService from '../customer.service';
import * as salesService from '../sales.service';
import * as orderService from '../order.service';
import * as menuItemService from '../menu-item.service';
import * as eventService from '../event.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';
import { PaymentPart } from '@cantina-pos/shared';

describe('CustomerService', () => {
  beforeEach(() => {
    // Reset all services before each test
    customerService.resetService();
    salesService.resetService();
    orderService.resetService();
    menuItemService.resetService();
    eventService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();
  });

  describe('createCustomer', () => {
    it('should create a customer with valid name', () => {
      const customer = customerService.createCustomer('João Silva');
      
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('João Silva');
      expect(customer.createdAt).toBeDefined();
      expect(customer.deletedAt).toBeUndefined();
    });

    it('should trim whitespace from name', () => {
      const customer = customerService.createCustomer('  Maria Santos  ');
      
      expect(customer.name).toBe('Maria Santos');
    });

    it('should throw error for empty name', () => {
      expect(() => customerService.createCustomer('')).toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for whitespace-only name', () => {
      expect(() => customerService.createCustomer('   ')).toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('searchCustomers', () => {
    beforeEach(() => {
      customerService.createCustomer('João Silva');
      customerService.createCustomer('Maria Santos');
      customerService.createCustomer('João Pedro');
    });

    it('should return all customers when query is empty', () => {
      const results = customerService.searchCustomers('');
      
      expect(results).toHaveLength(3);
    });


    it('should filter customers by name', () => {
      const results = customerService.searchCustomers('João');
      
      expect(results).toHaveLength(2);
      expect(results.every(c => c.name.includes('João'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results = customerService.searchCustomers('silva');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('João Silva');
    });

    it('should return empty array when no matches', () => {
      const results = customerService.searchCustomers('Carlos');
      
      expect(results).toHaveLength(0);
    });

    it('should not return soft-deleted customers', () => {
      const customer = customerService.createCustomer('Carlos Deleted');
      customerService.deleteCustomer(customer.id);
      
      const results = customerService.searchCustomers('Carlos');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getCustomer', () => {
    it('should return customer by ID', () => {
      const created = customerService.createCustomer('Test Customer');
      
      const customer = customerService.getCustomer(created.id);
      
      expect(customer.id).toBe(created.id);
      expect(customer.name).toBe('Test Customer');
    });

    it('should throw error for non-existent customer', () => {
      expect(() => customerService.getCustomer('non-existent')).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });

    it('should throw error for soft-deleted customer', () => {
      const customer = customerService.createCustomer('Deleted Customer');
      customerService.deleteCustomer(customer.id);
      
      expect(() => customerService.getCustomer(customer.id)).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });
  });

  describe('getCustomerBalance', () => {
    let eventId: string;
    let menuItemId: string;
    let customerId: string;

    beforeEach(() => {
      // Setup event and menu item for sales
      const event = eventService.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      eventId = event.id;
      
      const group = menuGroupService.getGroups()[0];
      const catalogItem = catalogItemService.createCatalogItem({
        description: 'Test Catalog Item',
        suggestedPrice: 10.00,
        groupId: group.id,
      });
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId: catalogItem.id,
        description: 'Test Item',
        price: 10.00,
        stock: 100,
        groupId: group.id,
      });
      menuItemId = menuItem.id;
      
      const customer = customerService.createCustomer('Credit Customer');
      customerId = customer.id;
    });

    it('should return 0 for customer with no sales', () => {
      const balance = customerService.getCustomerBalance(customerId);
      
      expect(balance).toBe(0);
    });

    it('should return credit amount for unpaid credit sale', () => {
      // Create order and confirm with credit
      const order = orderService.createOrder(eventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      
      const payments: PaymentPart[] = [{ method: 'credit', amount: 20.00 }];
      salesService.confirmSale(order.id, payments, 'user1', customerId);
      
      const balance = customerService.getCustomerBalance(customerId);
      
      expect(balance).toBe(20.00);
    });


    it('should reduce balance after payment', () => {
      // Create credit sale
      const order = orderService.createOrder(eventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 });
      
      const payments: PaymentPart[] = [{ method: 'credit', amount: 30.00 }];
      salesService.confirmSale(order.id, payments, 'user1', customerId);
      
      // Register partial payment
      customerService.registerPayment(customerId, [{ method: 'cash', amount: 10.00 }]);
      
      const balance = customerService.getCustomerBalance(customerId);
      
      expect(balance).toBe(20.00);
    });

    it('should return 0 when fully paid', () => {
      // Create credit sale
      const order = orderService.createOrder(eventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      
      const payments: PaymentPart[] = [{ method: 'credit', amount: 20.00 }];
      salesService.confirmSale(order.id, payments, 'user1', customerId);
      
      // Register full payment
      customerService.registerPayment(customerId, [{ method: 'cash', amount: 20.00 }]);
      
      const balance = customerService.getCustomerBalance(customerId);
      
      expect(balance).toBe(0);
    });

    it('should throw error for non-existent customer', () => {
      expect(() => customerService.getCustomerBalance('non-existent')).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });
  });

  describe('getCustomerHistory', () => {
    let eventId: string;
    let menuItemId: string;
    let customerId: string;

    beforeEach(() => {
      const event = eventService.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      eventId = event.id;
      
      const group = menuGroupService.getGroups()[0];
      const catalogItem = catalogItemService.createCatalogItem({
        description: 'Test Catalog Item',
        suggestedPrice: 10.00,
        groupId: group.id,
      });
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId: catalogItem.id,
        description: 'Test Item',
        price: 10.00,
        stock: 100,
        groupId: group.id,
      });
      menuItemId = menuItem.id;
      
      const customer = customerService.createCustomer('History Customer');
      customerId = customer.id;
    });

    it('should return empty history for new customer', () => {
      const history = customerService.getCustomerHistory(customerId);
      
      expect(history.sales).toHaveLength(0);
      expect(history.payments).toHaveLength(0);
    });

    it('should include all sales in history', () => {
      // Create two credit sales
      const order1 = orderService.createOrder(eventId);
      orderService.addItem(order1.id, { menuItemId, quantity: 1 });
      salesService.confirmSale(order1.id, [{ method: 'credit', amount: 10.00 }], 'user1', customerId);
      
      const order2 = orderService.createOrder(eventId);
      orderService.addItem(order2.id, { menuItemId, quantity: 2 });
      salesService.confirmSale(order2.id, [{ method: 'credit', amount: 20.00 }], 'user1', customerId);
      
      const history = customerService.getCustomerHistory(customerId);
      
      expect(history.sales).toHaveLength(2);
    });

    it('should include all payments in history', () => {
      // Create credit sale
      const order = orderService.createOrder(eventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 });
      salesService.confirmSale(order.id, [{ method: 'credit', amount: 30.00 }], 'user1', customerId);
      
      // Register two payments
      customerService.registerPayment(customerId, [{ method: 'cash', amount: 10.00 }]);
      customerService.registerPayment(customerId, [{ method: 'card', amount: 10.00 }]);
      
      const history = customerService.getCustomerHistory(customerId);
      
      expect(history.payments).toHaveLength(2);
    });

    it('should throw error for non-existent customer', () => {
      expect(() => customerService.getCustomerHistory('non-existent')).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });
  });


  describe('registerPayment', () => {
    let eventId: string;
    let menuItemId: string;
    let customerId: string;

    beforeEach(() => {
      const event = eventService.createEvent({ name: 'Test Event', dates: ['2024-01-01'], categories: ['Food'] });
      eventId = event.id;
      
      const group = menuGroupService.getGroups()[0];
      const catalogItem = catalogItemService.createCatalogItem({
        description: 'Test Catalog Item',
        suggestedPrice: 10.00,
        groupId: group.id,
      });
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId: catalogItem.id,
        description: 'Test Item',
        price: 10.00,
        stock: 100,
        groupId: group.id,
      });
      menuItemId = menuItem.id;
      
      const customer = customerService.createCustomer('Payment Customer');
      customerId = customer.id;
      
      // Create credit sale
      const order = orderService.createOrder(eventId);
      orderService.addItem(order.id, { menuItemId, quantity: 5 });
      salesService.confirmSale(order.id, [{ method: 'credit', amount: 50.00 }], 'user1', customerId);
    });

    it('should register a cash payment', () => {
      const payment = customerService.registerPayment(customerId, [{ method: 'cash', amount: 20.00 }]);
      
      expect(payment.id).toBeDefined();
      expect(payment.customerId).toBe(customerId);
      expect(payment.totalAmount).toBe(20.00);
      expect(payment.payments).toHaveLength(1);
      expect(payment.payments[0].method).toBe('cash');
    });

    it('should register a mixed payment', () => {
      const payment = customerService.registerPayment(customerId, [
        { method: 'cash', amount: 15.00 },
        { method: 'card', amount: 10.00 },
      ]);
      
      expect(payment.totalAmount).toBe(25.00);
      expect(payment.payments).toHaveLength(2);
    });

    it('should throw error for non-existent customer', () => {
      expect(() => 
        customerService.registerPayment('non-existent', [{ method: 'cash', amount: 10.00 }])
      ).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });

    it('should throw error for empty payments', () => {
      expect(() => 
        customerService.registerPayment(customerId, [])
      ).toThrow('ERR_NO_PAYMENT');
    });

    it('should throw error for negative payment amount', () => {
      expect(() => 
        customerService.registerPayment(customerId, [{ method: 'cash', amount: -10.00 }])
      ).toThrow('ERR_INVALID_PAYMENT_AMOUNT');
    });

    it('should throw error for zero payment amount', () => {
      expect(() => 
        customerService.registerPayment(customerId, [{ method: 'cash', amount: 0 }])
      ).toThrow('ERR_INVALID_PAYMENT_AMOUNT');
    });

    it('should throw error for credit payment method', () => {
      expect(() => 
        customerService.registerPayment(customerId, [{ method: 'credit', amount: 10.00 }])
      ).toThrow('ERR_INVALID_PAYMENT_METHOD');
    });

    it('should throw error when payment exceeds balance', () => {
      expect(() => 
        customerService.registerPayment(customerId, [{ method: 'cash', amount: 100.00 }])
      ).toThrow('ERR_PAYMENT_EXCEEDS_BALANCE');
    });

    it('should allow full balance payment', () => {
      const payment = customerService.registerPayment(customerId, [{ method: 'cash', amount: 50.00 }]);
      
      expect(payment.totalAmount).toBe(50.00);
      expect(customerService.getCustomerBalance(customerId)).toBe(0);
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete a customer', () => {
      const customer = customerService.createCustomer('To Delete');
      
      const deleted = customerService.deleteCustomer(customer.id);
      
      expect(deleted.deletedAt).toBeDefined();
    });

    it('should throw error for non-existent customer', () => {
      expect(() => customerService.deleteCustomer('non-existent')).toThrow('ERR_CUSTOMER_NOT_FOUND');
    });

    it('should not find deleted customer', () => {
      const customer = customerService.createCustomer('To Delete');
      customerService.deleteCustomer(customer.id);
      
      expect(customerService.customerExists(customer.id)).toBe(false);
    });
  });
});
