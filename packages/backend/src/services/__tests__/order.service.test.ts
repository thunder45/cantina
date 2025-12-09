import * as orderService from '../order.service';
import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';
import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';

describe('Order Service', () => {
  let testEventId: string;
  let menuItemId: string;

  beforeEach(async () => {
    orderService.resetService();
    eventService.resetService();
    eventCategoryService.resetRepository();
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();

    await eventCategoryService.initializeDefaultCategories();
    const categories = await eventCategoryService.getCategories();
    const event = await eventService.createEvent({ categoryId: categories[0].id, name: 'Test', dates: ['2024-01-15'] });
    testEventId = event.id;

    const group = await menuGroupService.createGroup('Test Group');
    const catalogItem = await catalogItemService.createCatalogItem({ description: 'Test Item', suggestedPrice: 10.00, groupId: group.id });
    const menuItem = await menuItemService.addMenuItem(testEventId, { catalogItemId: catalogItem.id, description: 'Test Item', price: 10.00, stock: 100, groupId: group.id });
    menuItemId = menuItem.id;
  });

  describe('createOrder', () => {
    it('should create a new order for a valid event', async () => {
      const order = await orderService.createOrder(testEventId);
      expect(order.eventId).toBe(testEventId);
      expect(order.items).toEqual([]);
      expect(order.total).toBe(0);
      expect(order.status).toBe('pending');
    });

    it('should throw error for non-existent event', async () => {
      await expect(orderService.createOrder('non-existent')).rejects.toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('addItem', () => {
    it('should add item to order', async () => {
      const order = await orderService.createOrder(testEventId);
      const updated = await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].quantity).toBe(2);
      expect(updated.total).toBe(20);
    });

    it('should increase quantity if item already exists', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = await orderService.addItem(order.id, { menuItemId, quantity: 3 });
      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].quantity).toBe(5);
    });

    it('should throw error for invalid quantity', async () => {
      const order = await orderService.createOrder(testEventId);
      await expect(orderService.addItem(order.id, { menuItemId, quantity: 0 })).rejects.toThrow('ERR_INVALID_QUANTITY');
    });

    it('should throw error for non-existent order', async () => {
      await expect(orderService.addItem('non-existent', { menuItemId, quantity: 1 })).rejects.toThrow('ERR_ORDER_NOT_FOUND');
    });

    it('should throw error for non-existent menu item', async () => {
      const order = await orderService.createOrder(testEventId);
      await expect(orderService.addItem(order.id, { menuItemId: 'non-existent', quantity: 1 })).rejects.toThrow('ERR_MENU_ITEM_NOT_FOUND');
    });
  });

  describe('removeItem', () => {
    it('should remove item from order', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = await orderService.removeItem(order.id, menuItemId);
      expect(updated.items).toHaveLength(0);
      expect(updated.total).toBe(0);
    });

    it('should throw error for non-existent item in order', async () => {
      const order = await orderService.createOrder(testEventId);
      await expect(orderService.removeItem(order.id, menuItemId)).rejects.toThrow('ERR_ITEM_NOT_IN_ORDER');
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = await orderService.updateItemQuantity(order.id, menuItemId, 5);
      expect(updated.items[0].quantity).toBe(5);
      expect(updated.total).toBe(50);
    });

    it('should remove item when quantity is 0', async () => {
      const order = await orderService.createOrder(testEventId);
      await orderService.addItem(order.id, { menuItemId, quantity: 2 });
      const updated = await orderService.updateItemQuantity(order.id, menuItemId, 0);
      expect(updated.items).toHaveLength(0);
    });
  });

  describe('getOrder', () => {
    it('should return order by ID', async () => {
      const created = await orderService.createOrder(testEventId);
      const order = await orderService.getOrder(created.id);
      expect(order.id).toBe(created.id);
    });

    it('should throw error for non-existent order', async () => {
      await expect(orderService.getOrder('non-existent')).rejects.toThrow('ERR_ORDER_NOT_FOUND');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const order = await orderService.createOrder(testEventId);
      const cancelled = await orderService.cancelOrder(order.id);
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('getOrdersByEvent', () => {
    it('should return orders for event', async () => {
      await orderService.createOrder(testEventId);
      await orderService.createOrder(testEventId);
      const orders = await orderService.getOrdersByEvent(testEventId);
      expect(orders).toHaveLength(2);
    });
  });
});
