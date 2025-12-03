import {
  createCatalogItem,
  getCatalogItemById,
  getCatalogItems,
  searchCatalogItems,
  updateCatalogItem,
  deleteCatalogItem,
  catalogItemExists,
  resetService,
} from '../catalog-item.service';
import { resetService as resetMenuGroupService, createGroup, initializeDefaultGroups, getGroups } from '../menu-group.service';

describe('CatalogItemService', () => {
  let defaultGroupId: string;

  beforeEach(() => {
    resetService();
    resetMenuGroupService();
    const groups = initializeDefaultGroups();
    defaultGroupId = groups[0].id;
  });

  describe('createCatalogItem', () => {
    /**
     * Requirements: 3.1
     * WHEN o caixa cria um novo item no catálogo 
     * THEN o Sistema POS SHALL armazenar descrição, preço sugerido e grupo associado
     */
    it('should create a catalog item with all required fields', () => {
      const item = createCatalogItem({
        description: 'Arroz com Feijão',
        suggestedPrice: 15.50,
        groupId: defaultGroupId,
      });

      expect(item.id).toBeDefined();
      expect(item.description).toBe('Arroz com Feijão');
      expect(item.suggestedPrice).toBe(15.50);
      expect(item.groupId).toBe(defaultGroupId);
      expect(item.createdAt).toBeDefined();
      expect(item.updatedAt).toBeDefined();
      expect(item.deletedAt).toBeUndefined();
    });

    /**
     * Requirements: 4.4
     * WHEN o caixa cria um novo item durante a montagem do menu 
     * THEN o Sistema POS SHALL adicionar o item ao catálogo para uso futuro
     */
    it('should make created item available in catalog', () => {
      const item = createCatalogItem({
        description: 'Refrigerante',
        suggestedPrice: 5.00,
        groupId: defaultGroupId,
      });

      const found = getCatalogItemById(item.id);
      expect(found).toEqual(item);
    });


    it('should throw error for empty description', () => {
      expect(() => createCatalogItem({
        description: '',
        suggestedPrice: 10.00,
        groupId: defaultGroupId,
      })).toThrow('ERR_EMPTY_NAME');

      expect(() => createCatalogItem({
        description: '   ',
        suggestedPrice: 10.00,
        groupId: defaultGroupId,
      })).toThrow('ERR_EMPTY_NAME');
    });

    /**
     * Requirements: 15.1
     * IF o caixa tenta criar item com preço menor ou igual a zero 
     * THEN o Sistema POS SHALL rejeitar e exibir mensagem de erro
     */
    it('should throw error for invalid price', () => {
      expect(() => createCatalogItem({
        description: 'Item',
        suggestedPrice: 0,
        groupId: defaultGroupId,
      })).toThrow('ERR_INVALID_PRICE');

      expect(() => createCatalogItem({
        description: 'Item',
        suggestedPrice: -5,
        groupId: defaultGroupId,
      })).toThrow('ERR_INVALID_PRICE');
    });

    it('should throw error for non-existent group', () => {
      expect(() => createCatalogItem({
        description: 'Item',
        suggestedPrice: 10.00,
        groupId: 'non-existent-group',
      })).toThrow('ERR_GROUP_NOT_FOUND');
    });

    it('should trim whitespace from description', () => {
      const item = createCatalogItem({
        description: '  Arroz  ',
        suggestedPrice: 10.00,
        groupId: defaultGroupId,
      });

      expect(item.description).toBe('Arroz');
    });
  });

  describe('getCatalogItems', () => {
    /**
     * Requirements: 3.4
     * WHEN o caixa visualiza o catálogo 
     * THEN o Sistema POS SHALL exibir todos os itens ordenados por grupo e descrição
     */
    it('should return all items sorted by group and description', () => {
      const groups = getGroups();
      
      createCatalogItem({ description: 'Zebra', suggestedPrice: 10, groupId: groups[0].id });
      createCatalogItem({ description: 'Apple', suggestedPrice: 10, groupId: groups[0].id });
      createCatalogItem({ description: 'Banana', suggestedPrice: 10, groupId: groups[0].id });

      const items = getCatalogItems();

      expect(items).toHaveLength(3);
      // Items in same group should be sorted by description
      expect(items[0].description).toBe('Apple');
      expect(items[1].description).toBe('Banana');
      expect(items[2].description).toBe('Zebra');
    });

    it('should filter by group when groupId is provided', () => {
      const groups = getGroups();
      
      createCatalogItem({ description: 'Item1', suggestedPrice: 10, groupId: groups[0].id });
      createCatalogItem({ description: 'Item2', suggestedPrice: 10, groupId: groups[1].id });

      const items = getCatalogItems(groups[0].id);

      expect(items).toHaveLength(1);
      expect(items[0].description).toBe('Item1');
    });

    /**
     * Requirements: 3.5
     * WHEN o caixa exclui um item do catálogo 
     * THEN o Sistema POS SHALL realizar soft delete mantendo histórico de uso
     */
    it('should exclude soft-deleted items by default', () => {
      const item = createCatalogItem({
        description: 'ToDelete',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      deleteCatalogItem(item.id);

      const items = getCatalogItems();
      expect(items).toHaveLength(0);
    });

    it('should include soft-deleted items when includeDeleted is true', () => {
      const item = createCatalogItem({
        description: 'ToDelete',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      deleteCatalogItem(item.id);

      const items = getCatalogItems(undefined, true);
      expect(items).toHaveLength(1);
      expect(items[0].deletedAt).toBeDefined();
    });
  });


  describe('searchCatalogItems', () => {
    /**
     * Requirements: 3.3
     * WHEN o caixa pesquisa itens no catálogo 
     * THEN o Sistema POS SHALL filtrar por descrição ou grupo
     */
    it('should find items by description', () => {
      createCatalogItem({ description: 'Arroz com Feijão', suggestedPrice: 15, groupId: defaultGroupId });
      createCatalogItem({ description: 'Refrigerante', suggestedPrice: 5, groupId: defaultGroupId });

      const results = searchCatalogItems('arroz');

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('Arroz com Feijão');
    });

    it('should find items by group name', () => {
      const groups = getGroups();
      const refeicaoGroup = groups.find(g => g.name === 'Refeição')!;
      const bebidaGroup = groups.find(g => g.name === 'Bebida')!;

      createCatalogItem({ description: 'Arroz', suggestedPrice: 15, groupId: refeicaoGroup.id });
      createCatalogItem({ description: 'Suco', suggestedPrice: 5, groupId: bebidaGroup.id });

      const results = searchCatalogItems('Bebida');

      expect(results).toHaveLength(1);
      expect(results[0].description).toBe('Suco');
    });

    it('should be case insensitive', () => {
      createCatalogItem({ description: 'ARROZ', suggestedPrice: 15, groupId: defaultGroupId });

      const results = searchCatalogItems('arroz');

      expect(results).toHaveLength(1);
    });

    it('should return empty array for empty query', () => {
      createCatalogItem({ description: 'Arroz', suggestedPrice: 15, groupId: defaultGroupId });

      const results = searchCatalogItems('');

      expect(results).toHaveLength(0);
    });

    /**
     * Requirements: 3.5 (Property 24)
     * Soft-deleted items should NOT appear in search results
     */
    it('should never include soft-deleted items', () => {
      const item = createCatalogItem({ description: 'Arroz', suggestedPrice: 15, groupId: defaultGroupId });
      deleteCatalogItem(item.id);

      const results = searchCatalogItems('Arroz');

      expect(results).toHaveLength(0);
    });
  });

  describe('updateCatalogItem', () => {
    /**
     * Requirements: 3.2
     * WHEN o caixa edita um item existente no catálogo 
     * THEN o Sistema POS SHALL atualizar os dados sem afetar menus já criados
     * Note: Menu items store snapshots, so catalog edits don't affect them
     */
    it('should update catalog item fields', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      const updated = updateCatalogItem(item.id, {
        description: 'Arroz Integral',
        suggestedPrice: 12,
      });

      expect(updated.description).toBe('Arroz Integral');
      expect(updated.suggestedPrice).toBe(12);
      expect(updated.groupId).toBe(defaultGroupId);
      expect(updated.id).toBe(item.id);
      expect(updated.createdAt).toBe(item.createdAt);
      // updatedAt should be set (may or may not differ depending on timing)
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent item', () => {
      expect(() => updateCatalogItem('non-existent', { description: 'Test' }))
        .toThrow('ERR_ITEM_NOT_FOUND');
    });

    it('should throw error for soft-deleted item', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });
      deleteCatalogItem(item.id);

      expect(() => updateCatalogItem(item.id, { description: 'Test' }))
        .toThrow('ERR_ITEM_NOT_FOUND');
    });

    it('should throw error for empty description', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      expect(() => updateCatalogItem(item.id, { description: '' }))
        .toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for invalid price', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      expect(() => updateCatalogItem(item.id, { suggestedPrice: 0 }))
        .toThrow('ERR_INVALID_PRICE');
    });

    it('should throw error for non-existent group', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      expect(() => updateCatalogItem(item.id, { groupId: 'non-existent' }))
        .toThrow('ERR_GROUP_NOT_FOUND');
    });
  });

  describe('deleteCatalogItem', () => {
    /**
     * Requirements: 3.5
     * WHEN o caixa exclui um item do catálogo 
     * THEN o Sistema POS SHALL realizar soft delete mantendo histórico de uso
     */
    it('should soft delete item (set deletedAt)', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      deleteCatalogItem(item.id);

      // Item should not be found with default query
      expect(getCatalogItemById(item.id)).toBeUndefined();
      
      // But should be found when including deleted
      const deleted = getCatalogItemById(item.id, true);
      expect(deleted).toBeDefined();
      expect(deleted!.deletedAt).toBeDefined();
    });

    it('should throw error for non-existent item', () => {
      expect(() => deleteCatalogItem('non-existent'))
        .toThrow('ERR_ITEM_NOT_FOUND');
    });

    it('should throw error for already deleted item', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });
      deleteCatalogItem(item.id);

      expect(() => deleteCatalogItem(item.id))
        .toThrow('ERR_ITEM_NOT_FOUND');
    });
  });

  describe('catalogItemExists', () => {
    it('should return true for existing item', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });

      expect(catalogItemExists(item.id)).toBe(true);
    });

    it('should return false for non-existent item', () => {
      expect(catalogItemExists('non-existent')).toBe(false);
    });

    it('should return false for soft-deleted item', () => {
      const item = createCatalogItem({
        description: 'Arroz',
        suggestedPrice: 10,
        groupId: defaultGroupId,
      });
      deleteCatalogItem(item.id);

      expect(catalogItemExists(item.id)).toBe(false);
    });
  });
});
