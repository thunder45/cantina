import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';
import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';

describe('MenuItemService', () => {
  let eventId: string;
  let groupId: string;
  let catalogItemId: string;

  beforeEach(async () => {
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();
    eventService.resetService();
    eventCategoryService.resetRepository();

    await eventCategoryService.initializeDefaultCategories();
    const categories = await eventCategoryService.getCategories();
    const event = await eventService.createEvent({ categoryId: categories[0].id, name: 'Test', dates: ['2024-01-15'] });
    eventId = event.id;

    const group = await menuGroupService.createGroup('Bebidas');
    groupId = group.id;

    const catalogItem = await catalogItemService.createCatalogItem({ description: 'Coca-Cola', suggestedPrice: 3.50, groupId });
    catalogItemId = catalogItem.id;
  });

  describe('addMenuItem', () => {
    it('should add a menu item to an event', async () => {
      const menuItem = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Coca-Cola', price: 4.00, stock: 50, groupId });
      expect(menuItem.eventId).toBe(eventId);
      expect(menuItem.description).toBe('Coca-Cola');
      expect(menuItem.price).toBe(4.00);
      expect(menuItem.stock).toBe(50);
      expect(menuItem.soldCount).toBe(0);
    });

    it('should allow stock of 0 for infinite stock', async () => {
      const menuItem = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Coca-Cola', price: 4.00, stock: 0, groupId });
      expect(menuItem.stock).toBe(0);
      expect(await menuItemService.getAvailableStock(menuItem.id)).toBe(Infinity);
    });

    it('should throw error for invalid price', async () => {
      await expect(menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 0, stock: 10, groupId })).rejects.toThrow('ERR_INVALID_PRICE');
    });

    it('should throw error for negative stock', async () => {
      await expect(menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: -1, groupId })).rejects.toThrow('ERR_INVALID_STOCK');
    });

    it('should throw error for non-existent event', async () => {
      await expect(menuItemService.addMenuItem('non-existent', { catalogItemId, description: 'Test', price: 5, stock: 10, groupId })).rejects.toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('getMenuItemsByEvent', () => {
    it('should return all menu items for an event', async () => {
      await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Item1', price: 5, stock: 10, groupId });
      await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Item2', price: 6, stock: 20, groupId });
      const items = await menuItemService.getMenuItemsByEvent(eventId);
      expect(items).toHaveLength(2);
    });
  });

  describe('getMenuItem', () => {
    it('should return menu item by ID', async () => {
      const created = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      const item = await menuItemService.getMenuItem(created.id);
      expect(item.id).toBe(created.id);
    });

    it('should throw error for non-existent item', async () => {
      await expect(menuItemService.getMenuItem('non-existent')).rejects.toThrow('ERR_MENU_ITEM_NOT_FOUND');
    });
  });

  describe('updateMenuItem', () => {
    it('should update menu item fields', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Original', price: 5, stock: 10, groupId });
      const updated = await menuItemService.updateMenuItem(item.id, { price: 7, stock: 20 });
      expect(updated.price).toBe(7);
      expect(updated.stock).toBe(20);
    });

    it('should throw error for invalid price', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      await expect(menuItemService.updateMenuItem(item.id, { price: 0 })).rejects.toThrow('ERR_INVALID_PRICE');
    });
  });

  describe('removeMenuItem', () => {
    it('should remove menu item', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      await menuItemService.removeMenuItem(item.id);
      await expect(menuItemService.getMenuItem(item.id)).rejects.toThrow('ERR_MENU_ITEM_NOT_FOUND');
    });
  });

  describe('incrementSoldCount', () => {
    it('should increment sold count', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      await menuItemService.incrementSoldCount(item.id, 3);
      const updated = await menuItemService.getMenuItem(item.id);
      expect(updated.soldCount).toBe(3);
    });

    it('should throw error when exceeding stock', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 5, groupId });
      await expect(menuItemService.incrementSoldCount(item.id, 10)).rejects.toThrow('ERR_STOCK_INSUFFICIENT');
    });
  });

  describe('decrementSoldCount', () => {
    it('should decrement sold count', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      await menuItemService.incrementSoldCount(item.id, 5);
      await menuItemService.decrementSoldCount(item.id, 2);
      const updated = await menuItemService.getMenuItem(item.id);
      expect(updated.soldCount).toBe(3);
    });
  });

  describe('getAvailableStock', () => {
    it('should return available stock', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      await menuItemService.incrementSoldCount(item.id, 3);
      expect(await menuItemService.getAvailableStock(item.id)).toBe(7);
    });

    it('should return Infinity for zero stock (infinite)', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 0, groupId });
      expect(await menuItemService.getAvailableStock(item.id)).toBe(Infinity);
    });
  });

  describe('menuItemExists', () => {
    it('should return true for existing item', async () => {
      const item = await menuItemService.addMenuItem(eventId, { catalogItemId, description: 'Test', price: 5, stock: 10, groupId });
      expect(await menuItemService.menuItemExists(item.id)).toBe(true);
    });

    it('should return false for non-existent item', async () => {
      expect(await menuItemService.menuItemExists('non-existent')).toBe(false);
    });
  });
});
