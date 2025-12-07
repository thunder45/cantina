import * as menuItemService from '../menu-item.service';
import * as menuGroupService from '../menu-group.service';
import * as catalogItemService from '../catalog-item.service';
import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';
import { resetRepository as resetMenuItemRepo } from '../../repositories/menu-item.repository';

describe('MenuItemService', () => {
  let eventId: string;
  let groupId: string;
  let catalogItemId: string;
  let testCategoryId: string;

  beforeEach(() => {
    // Reset all services
    menuItemService.resetService();
    menuGroupService.resetService();
    catalogItemService.resetService();
    eventService.resetService();
    eventCategoryService.resetService();

    // Initialize default categories
    eventCategoryService.initializeDefaultCategories();
    const categories = eventCategoryService.getCategories();
    testCategoryId = categories[0].id;

    // Create test event
    const event = eventService.createEvent({
      categoryId: testCategoryId,
      name: 'Test Event',
      dates: ['2024-01-15'],
    });
    eventId = event.id;

    // Create test group
    const group = menuGroupService.createGroup('Bebidas');
    groupId = group.id;

    // Create test catalog item
    const catalogItem = catalogItemService.createCatalogItem({
      description: 'Coca-Cola',
      suggestedPrice: 3.50,
      groupId: groupId,
    });
    catalogItemId = catalogItem.id;
  });

  describe('addMenuItem', () => {
    it('should add a menu item to an event', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      expect(menuItem.id).toBeDefined();
      expect(menuItem.eventId).toBe(eventId);
      expect(menuItem.catalogItemId).toBe(catalogItemId);
      expect(menuItem.description).toBe('Coca-Cola');
      expect(menuItem.price).toBe(4.00);
      expect(menuItem.stock).toBe(50);
      expect(menuItem.soldCount).toBe(0);
      expect(menuItem.groupId).toBe(groupId);
    });


    it('should allow stock of 0 for infinite stock (Req 4.3)', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 0, // Infinite stock
        groupId,
      });

      expect(menuItem.stock).toBe(0);
      // Infinite stock should return Infinity for available
      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(Infinity);
    });

    it('should throw error for invalid event', () => {
      expect(() => menuItemService.addMenuItem('invalid-event', {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      })).toThrow('ERR_EVENT_NOT_FOUND');
    });

    it('should throw error for invalid group', () => {
      expect(() => menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId: 'invalid-group',
      })).toThrow('ERR_GROUP_NOT_FOUND');
    });

    it('should throw error for price <= 0 (Req 15.1)', () => {
      expect(() => menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 0,
        stock: 50,
        groupId,
      })).toThrow('ERR_INVALID_PRICE');

      expect(() => menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: -5,
        stock: 50,
        groupId,
      })).toThrow('ERR_INVALID_PRICE');
    });
  });

  describe('getMenuItemsByEvent', () => {
    it('should return all menu items for an event', () => {
      menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Fanta',
        price: 3.50,
        stock: 30,
        groupId,
      });

      const items = menuItemService.getMenuItemsByEvent(eventId);
      expect(items).toHaveLength(2);
    });

    it('should return empty array for event with no items', () => {
      const items = menuItemService.getMenuItemsByEvent(eventId);
      expect(items).toHaveLength(0);
    });

    it('should throw error for invalid event', () => {
      expect(() => menuItemService.getMenuItemsByEvent('invalid-event'))
        .toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('updateMenuItem', () => {
    it('should update menu item price', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      const updated = menuItemService.updateMenuItem(menuItem.id, { price: 5.00 });
      expect(updated.price).toBe(5.00);
    });

    it('should update menu item stock', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      const updated = menuItemService.updateMenuItem(menuItem.id, { stock: 100 });
      expect(updated.stock).toBe(100);
    });
  });

  describe('removeMenuItem', () => {
    it('should remove a menu item', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      menuItemService.removeMenuItem(menuItem.id);
      expect(menuItemService.menuItemExists(menuItem.id)).toBe(false);
    });

    it('should throw error for non-existent item', () => {
      expect(() => menuItemService.removeMenuItem('invalid-id'))
        .toThrow('ERR_MENU_ITEM_NOT_FOUND');
    });
  });

  describe('stock management', () => {
    it('should track available stock correctly', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(50);
      
      menuItemService.incrementSoldCount(menuItem.id, 10);
      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(40);
    });

    it('should handle infinite stock (stock = 0) correctly (Req 4.3)', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 0, // Infinite
        groupId,
      });

      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(Infinity);
      expect(menuItemService.isMenuItemAvailable(menuItem.id)).toBe(true);

      // Selling should not affect availability for infinite stock
      menuItemService.incrementSoldCount(menuItem.id, 1000);
      expect(menuItemService.isMenuItemAvailable(menuItem.id)).toBe(true);
    });

    it('should mark item unavailable when stock exhausted (Req 6.2)', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 10,
        groupId,
      });

      expect(menuItemService.isMenuItemAvailable(menuItem.id)).toBe(true);
      
      menuItemService.incrementSoldCount(menuItem.id, 10);
      expect(menuItemService.isMenuItemAvailable(menuItem.id)).toBe(false);
    });

    it('should throw error when trying to sell more than available (Req 6.4)', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 10,
        groupId,
      });

      expect(() => menuItemService.incrementSoldCount(menuItem.id, 15))
        .toThrow('ERR_STOCK_INSUFFICIENT');
    });

    it('should restore stock on decrement (for refunds)', () => {
      const menuItem = menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      menuItemService.incrementSoldCount(menuItem.id, 20);
      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(30);

      menuItemService.decrementSoldCount(menuItem.id, 5);
      expect(menuItemService.getAvailableStock(menuItem.id)).toBe(35);
    });
  });

  describe('groupHasMenuItems', () => {
    it('should return true when group has items in event', () => {
      menuItemService.addMenuItem(eventId, {
        catalogItemId,
        description: 'Coca-Cola',
        price: 4.00,
        stock: 50,
        groupId,
      });

      expect(menuItemService.groupHasMenuItems(groupId, eventId)).toBe(true);
    });

    it('should return false when group has no items in event', () => {
      expect(menuItemService.groupHasMenuItems(groupId, eventId)).toBe(false);
    });
  });
});
