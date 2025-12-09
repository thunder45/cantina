import * as catalogItemService from '../catalog-item.service';
import * as menuGroupService from '../menu-group.service';

describe('CatalogItemService', () => {
  let defaultGroupId: string;

  beforeEach(async () => {
    catalogItemService.resetService();
    menuGroupService.resetService();
    const groups = await menuGroupService.initializeDefaultGroups();
    defaultGroupId = groups[0].id;
  });

  describe('createCatalogItem', () => {
    it('should create a catalog item with all required fields', async () => {
      const item = await catalogItemService.createCatalogItem({
        description: 'Arroz com Feijão',
        suggestedPrice: 15.50,
        groupId: defaultGroupId,
      });
      expect(item.description).toBe('Arroz com Feijão');
      expect(item.suggestedPrice).toBe(15.50);
      expect(item.groupId).toBe(defaultGroupId);
    });

    it('should throw error for empty description', async () => {
      await expect(catalogItemService.createCatalogItem({
        description: '',
        suggestedPrice: 10.00,
        groupId: defaultGroupId,
      })).rejects.toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for invalid price', async () => {
      await expect(catalogItemService.createCatalogItem({
        description: 'Item',
        suggestedPrice: 0,
        groupId: defaultGroupId,
      })).rejects.toThrow('ERR_INVALID_PRICE');
    });

    it('should throw error for non-existent group', async () => {
      await expect(catalogItemService.createCatalogItem({
        description: 'Item',
        suggestedPrice: 10.00,
        groupId: 'non-existent',
      })).rejects.toThrow('ERR_GROUP_NOT_FOUND');
    });
  });

  describe('getCatalogItems', () => {
    it('should return all items sorted by description', async () => {
      await catalogItemService.createCatalogItem({ description: 'Zebra', suggestedPrice: 10, groupId: defaultGroupId });
      await catalogItemService.createCatalogItem({ description: 'Apple', suggestedPrice: 10, groupId: defaultGroupId });
      const items = await catalogItemService.getCatalogItems();
      expect(items[0].description).toBe('Apple');
      expect(items[1].description).toBe('Zebra');
    });

    it('should filter by group when groupId is provided', async () => {
      const groups = await menuGroupService.getGroups();
      await catalogItemService.createCatalogItem({ description: 'Item1', suggestedPrice: 10, groupId: groups[0].id });
      await catalogItemService.createCatalogItem({ description: 'Item2', suggestedPrice: 10, groupId: groups[1].id });
      const items = await catalogItemService.getCatalogItems(groups[0].id);
      expect(items).toHaveLength(1);
      expect(items[0].description).toBe('Item1');
    });

    it('should exclude soft-deleted items by default', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'ToDelete', suggestedPrice: 10, groupId: defaultGroupId });
      await catalogItemService.deleteCatalogItem(item.id);
      const items = await catalogItemService.getCatalogItems();
      expect(items).toHaveLength(0);
    });
  });

  describe('searchCatalogItems', () => {
    it('should find items by description', async () => {
      await catalogItemService.createCatalogItem({ description: 'Arroz com Feijão', suggestedPrice: 15, groupId: defaultGroupId });
      await catalogItemService.createCatalogItem({ description: 'Refrigerante', suggestedPrice: 5, groupId: defaultGroupId });
      const results = await catalogItemService.searchCatalogItems('arroz');
      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('Arroz com Feijão');
    });

    it('should be case insensitive', async () => {
      await catalogItemService.createCatalogItem({ description: 'ARROZ', suggestedPrice: 15, groupId: defaultGroupId });
      const results = await catalogItemService.searchCatalogItems('arroz');
      expect(results).toHaveLength(1);
    });
  });

  describe('updateCatalogItem', () => {
    it('should update catalog item fields', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'Arroz', suggestedPrice: 10, groupId: defaultGroupId });
      const updated = await catalogItemService.updateCatalogItem(item.id, { description: 'Arroz Integral', suggestedPrice: 12 });
      expect(updated.description).toBe('Arroz Integral');
      expect(updated.suggestedPrice).toBe(12);
    });

    it('should throw error for non-existent item', async () => {
      await expect(catalogItemService.updateCatalogItem('non-existent', { description: 'Test' })).rejects.toThrow('ERR_ITEM_NOT_FOUND');
    });

    it('should throw error for empty description', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'Arroz', suggestedPrice: 10, groupId: defaultGroupId });
      await expect(catalogItemService.updateCatalogItem(item.id, { description: '' })).rejects.toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('deleteCatalogItem', () => {
    it('should soft delete item', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'Arroz', suggestedPrice: 10, groupId: defaultGroupId });
      await catalogItemService.deleteCatalogItem(item.id);
      expect(await catalogItemService.getCatalogItemById(item.id)).toBeUndefined();
      const deleted = await catalogItemService.getCatalogItemById(item.id, true);
      expect(deleted?.deletedAt).toBeDefined();
    });

    it('should throw error for non-existent item', async () => {
      await expect(catalogItemService.deleteCatalogItem('non-existent')).rejects.toThrow('ERR_ITEM_NOT_FOUND');
    });
  });

  describe('catalogItemExists', () => {
    it('should return true for existing item', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'Arroz', suggestedPrice: 10, groupId: defaultGroupId });
      expect(await catalogItemService.catalogItemExists(item.id)).toBe(true);
    });

    it('should return false for non-existent item', async () => {
      expect(await catalogItemService.catalogItemExists('non-existent')).toBe(false);
    });

    it('should return false for soft-deleted item', async () => {
      const item = await catalogItemService.createCatalogItem({ description: 'Arroz', suggestedPrice: 10, groupId: defaultGroupId });
      await catalogItemService.deleteCatalogItem(item.id);
      expect(await catalogItemService.catalogItemExists(item.id)).toBe(false);
    });
  });
});
