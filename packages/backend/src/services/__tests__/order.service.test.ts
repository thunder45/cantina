import * as orderService from '../order.service';
import * as eventService from '../event.service';
import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';

describe('Order Service', () => {
  let testEventId: string;
  let testGroupId: string;
  let menuItemId: string;
  let catalogItemId: string;

  beforeEach(() => {
    // Reset all services
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
    orderService.resetService();
    eventService.resetService();
    menuItemService.resetService();
    menuGroupService.resetService();
  });

  describe('createOrder', () => {
    it('should create a new order for a valid event', () => {
      const order = orderService.createOrder(testEventId);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.eventId).toBe(testEventId);
      expect(order.items).toEqual([]);
      expect(order.total).toBe(0);
      expect(order.status).toBe('pending');
      expect(order.createdAt).toBeDefined();
    });

    it('should throw error for non-existent event', () => {
      expect(() => orderService.createOrder('non-existent')).toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('getOrder', () => {
    it('should return an existing order', () => {
      const created = orderService.createOrder(testEventId);
      const retrieved = orderService.getOrder(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw error for non-existent order', () => {
      expect(() => orderService.getOrder('non-existent')).toThrow('ERR_ORDER_NOT_FOUND');
    });
  });

  describe('addItem', () => {
    it('should add an item to an order', () => {
      const order = orderService.createOrder(testEventId);
      const updated = orderService.addItem(order.id, {
        menuItemId,
        quantity: 2,
      });

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].menuItemId).toBe(menuItemId);
      expect(updated.items[0].quantity).toBe(2);
      expect(updated.items[0].price).toBe(10.00);
      expect(updated.total).toBe(20.00);
    });

    it('should accumulate quantity when adding same item twice', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = orderService.addItem(order.id, { menuItemId, quantity: 3 });

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].quantity).toBe(5);
      expect(updated.total).toBe(50.00);
    });

    it('should throw error for invalid quantity', () => {
      const order = orderService.createOrder(testEventId);
      
      expect(() => orderService.addItem(order.id, { menuItemId, quantity: 0 }))
        .toThrow('ERR_INVALID_QUANTITY');
      expect(() => orderService.addItem(order.id, { menuItemId, quantity: -1 }))
        .toThrow('ERR_INVALID_QUANTITY');
    });

    it('should throw error for non-existent order', () => {
      expect(() => orderService.addItem('non-existent', { menuItemId, quantity: 1 }))
        .toThrow('ERR_ORDER_NOT_FOUND');
    });

    it('should throw error for non-existent menu item', () => {
      const order = orderService.createOrder(testEventId);
      
      expect(() => orderService.addItem(order.id, { menuItemId: 'non-existent', quantity: 1 }))
        .toThrow('ERR_MENU_ITEM_NOT_FOUND');
    });

    it('should limit quantity to available stock (Requirements: 6.4)', () => {
      // Create catalog item for limited stock item
      const limitedCatalog = catalogItemService.createCatalogItem({
        description: 'Limited Catalog Item',
        suggestedPrice: 5.00,
        groupId: testGroupId,
      });
      
      // Create item with limited stock
      const limitedItem = menuItemService.addMenuItem(testEventId, {
        catalogItemId: limitedCatalog.id,
        description: 'Limited Item',
        price: 5.00,
        stock: 3,
        groupId: testGroupId,
      });

      const order = orderService.createOrder(testEventId);
      const updated = orderService.addItem(order.id, {
        menuItemId: limitedItem.id,
        quantity: 10, // Request more than available
      });

      expect(updated.items[0].quantity).toBe(3); // Limited to available stock
      expect(updated.total).toBe(15.00);
    });

    it('should throw error when stock is exhausted', () => {
      // Create catalog item for limited stock item
      const limitedCatalog2 = catalogItemService.createCatalogItem({
        description: 'Limited Catalog Item 2',
        suggestedPrice: 5.00,
        groupId: testGroupId,
      });
      
      // Create item with limited stock
      const limitedItem = menuItemService.addMenuItem(testEventId, {
        catalogItemId: limitedCatalog2.id,
        description: 'Limited Item 2',
        price: 5.00,
        stock: 2,
        groupId: testGroupId,
      });

      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId: limitedItem.id, quantity: 2 });

      // Try to add more
      expect(() => orderService.addItem(order.id, { menuItemId: limitedItem.id, quantity: 1 }))
        .toThrow('ERR_STOCK_INSUFFICIENT');
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity in an order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = orderService.updateItemQuantity(order.id, menuItemId, 5);

      expect(updated.items[0].quantity).toBe(5);
      expect(updated.total).toBe(50.00);
    });

    it('should remove item when quantity is set to 0', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = orderService.updateItemQuantity(order.id, menuItemId, 0);

      expect(updated.items).toHaveLength(0);
      expect(updated.total).toBe(0);
    });

    it('should throw error for negative quantity', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });

      expect(() => orderService.updateItemQuantity(order.id, menuItemId, -1))
        .toThrow('ERR_INVALID_QUANTITY');
    });

    it('should limit quantity to available stock', () => {
      const limitedCatalog3 = catalogItemService.createCatalogItem({
        description: 'Limited Catalog Item 3',
        suggestedPrice: 5.00,
        groupId: testGroupId,
      });
      
      const limitedItem = menuItemService.addMenuItem(testEventId, {
        catalogItemId: limitedCatalog3.id,
        description: 'Limited Item 3',
        price: 5.00,
        stock: 5,
        groupId: testGroupId,
      });

      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId: limitedItem.id, quantity: 2 });
      const updated = orderService.updateItemQuantity(order.id, limitedItem.id, 100);

      expect(updated.items[0].quantity).toBe(5); // Limited to available stock
    });
  });

  describe('removeItem', () => {
    it('should remove an item from an order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = orderService.removeItem(order.id, menuItemId);

      expect(updated.items).toHaveLength(0);
      expect(updated.total).toBe(0);
    });

    it('should throw error for item not in order', () => {
      const order = orderService.createOrder(testEventId);

      expect(() => orderService.removeItem(order.id, menuItemId))
        .toThrow('ERR_ITEM_NOT_IN_ORDER');
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total correctly for multiple items', () => {
      const catalog2 = catalogItemService.createCatalogItem({
        description: 'Catalog Item 2',
        suggestedPrice: 15.00,
        groupId: testGroupId,
      });
      
      const item2 = menuItemService.addMenuItem(testEventId, {
        catalogItemId: catalog2.id,
        description: 'Item 2',
        price: 15.00,
        stock: 50,
        groupId: testGroupId,
      });

      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 3 }); // 3 * 10 = 30
      orderService.addItem(order.id, { menuItemId: item2.id, quantity: 2 }); // 2 * 15 = 30

      const total = orderService.calculateTotal(orderService.getOrder(order.id));
      expect(total).toBe(60.00);
    });

    it('should return 0 for empty order', () => {
      const order = orderService.createOrder(testEventId);
      const total = orderService.calculateTotal(order);
      expect(total).toBe(0);
    });
  });

  describe('clearOrder', () => {
    it('should clear all items from an order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const cleared = orderService.clearOrder(order.id);

      expect(cleared.items).toHaveLength(0);
      expect(cleared.total).toBe(0);
      expect(cleared.status).toBe('pending');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const cancelled = orderService.cancelOrder(order.id);

      expect(cancelled.status).toBe('cancelled');
    });

    it('should throw error for non-pending order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      orderService.confirmOrder(order.id);

      expect(() => orderService.cancelOrder(order.id))
        .toThrow('ERR_ORDER_NOT_PENDING');
    });
  });

  describe('confirmOrder', () => {
    it('should confirm a pending order with items', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const confirmed = orderService.confirmOrder(order.id);

      expect(confirmed.status).toBe('confirmed');
    });

    it('should throw error for empty order', () => {
      const order = orderService.createOrder(testEventId);

      expect(() => orderService.confirmOrder(order.id))
        .toThrow('ERR_ORDER_EMPTY');
    });

    it('should throw error for non-pending order', () => {
      const order = orderService.createOrder(testEventId);
      orderService.addItem(order.id, { menuItemId, quantity: 2 });
      orderService.cancelOrder(order.id);

      expect(() => orderService.confirmOrder(order.id))
        .toThrow('ERR_ORDER_NOT_PENDING');
    });
  });

  describe('infinite stock handling', () => {
    it('should allow unlimited quantity for items with infinite stock (stock=0)', () => {
      const infiniteCatalog = catalogItemService.createCatalogItem({
        description: 'Infinite Catalog Item',
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

      const order = orderService.createOrder(testEventId);
      const updated = orderService.addItem(order.id, {
        menuItemId: infiniteItem.id,
        quantity: 1000,
      });

      expect(updated.items[0].quantity).toBe(1000);
      expect(updated.total).toBe(5000.00);
    });
  });
});
