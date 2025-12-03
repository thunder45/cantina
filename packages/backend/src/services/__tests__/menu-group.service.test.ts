import {
  getGroups,
  getGroupById,
  createGroup,
  deleteGroup,
  groupExists,
  initializeDefaultGroups,
  resetService,
  setMenuItemsChecker,
} from '../menu-group.service';

describe('MenuGroupService', () => {
  beforeEach(() => {
    resetService();
  });

  describe('initializeDefaultGroups', () => {
    /**
     * Requirements: 2.1
     * WHEN o Sistema POS é inicializado pela primeira vez 
     * THEN o Sistema POS SHALL criar três grupos padrão: Refeição, Bebida e Sobremesa
     */
    it('should create three default groups on first initialization', () => {
      const groups = initializeDefaultGroups();
      
      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.name)).toEqual(['Refeição', 'Bebida', 'Sobremesa']);
      expect(groups.every(g => g.isDefault)).toBe(true);
    });

    it('should return existing groups on subsequent calls', () => {
      const firstCall = initializeDefaultGroups();
      const secondCall = initializeDefaultGroups();
      
      expect(firstCall).toEqual(secondCall);
    });
  });

  describe('getGroups', () => {
    /**
     * Requirements: 2.2
     * WHEN o caixa adiciona um novo grupo 
     * THEN o Sistema POS SHALL criar o grupo e disponibilizá-lo para seleção de itens
     */
    it('should return all groups sorted by order', () => {
      initializeDefaultGroups();
      const groups = getGroups();
      
      expect(groups).toHaveLength(3);
      expect(groups[0].order).toBeLessThan(groups[1].order);
      expect(groups[1].order).toBeLessThan(groups[2].order);
    });

    it('should auto-initialize default groups if not initialized', () => {
      const groups = getGroups();
      
      expect(groups).toHaveLength(3);
    });
  });

  describe('createGroup', () => {
    /**
     * Requirements: 2.2
     * WHEN o caixa adiciona um novo grupo 
     * THEN o Sistema POS SHALL criar o grupo e disponibilizá-lo para seleção de itens
     */
    it('should create a new group and make it available', () => {
      initializeDefaultGroups();
      
      const newGroup = createGroup('Lanches');
      
      expect(newGroup.name).toBe('Lanches');
      expect(newGroup.isDefault).toBe(false);
      expect(getGroups()).toContainEqual(newGroup);
    });

    it('should assign order after existing groups', () => {
      initializeDefaultGroups();
      
      const newGroup = createGroup('Lanches');
      const groups = getGroups();
      const maxExistingOrder = Math.max(...groups.filter(g => g.id !== newGroup.id).map(g => g.order));
      
      expect(newGroup.order).toBeGreaterThan(maxExistingOrder);
    });

    it('should throw error for empty name', () => {
      expect(() => createGroup('')).toThrow('ERR_EMPTY_NAME');
      expect(() => createGroup('   ')).toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for duplicate name', () => {
      initializeDefaultGroups();
      
      expect(() => createGroup('Refeição')).toThrow('ERR_DUPLICATE_NAME');
      expect(() => createGroup('refeição')).toThrow('ERR_DUPLICATE_NAME'); // case insensitive
    });

    it('should trim whitespace from name', () => {
      const group = createGroup('  Lanches  ');
      
      expect(group.name).toBe('Lanches');
    });
  });

  describe('deleteGroup', () => {
    /**
     * Requirements: 2.3
     * WHEN o caixa remove um grupo sem itens associados ao evento atual 
     * THEN o Sistema POS SHALL remover o grupo da lista de grupos ativos
     */
    it('should delete group without associated items', () => {
      initializeDefaultGroups();
      const newGroup = createGroup('Lanches');
      
      deleteGroup(newGroup.id);
      
      expect(getGroups()).not.toContainEqual(newGroup);
      expect(groupExists(newGroup.id)).toBe(false);
    });

    /**
     * Requirements: 2.4
     * IF o caixa tenta remover um grupo com itens associados ao evento atual 
     * THEN o Sistema POS SHALL exibir mensagem de erro e manter o grupo
     */
    it('should throw error when deleting group with associated items', () => {
      initializeDefaultGroups();
      const groups = getGroups();
      const groupWithItems = groups[0];
      
      // Simulate that this group has items
      setMenuItemsChecker((groupId) => groupId === groupWithItems.id);
      
      expect(() => deleteGroup(groupWithItems.id)).toThrow('ERR_GROUP_HAS_ITEMS');
      expect(groupExists(groupWithItems.id)).toBe(true);
    });

    it('should throw error for non-existent group', () => {
      initializeDefaultGroups();
      
      expect(() => deleteGroup('non-existent-id')).toThrow('ERR_GROUP_NOT_FOUND');
    });
  });

  describe('getGroupById', () => {
    it('should return group by ID', () => {
      initializeDefaultGroups();
      const groups = getGroups();
      const firstGroup = groups[0];
      
      const found = getGroupById(firstGroup.id);
      
      expect(found).toEqual(firstGroup);
    });

    it('should return undefined for non-existent ID', () => {
      initializeDefaultGroups();
      
      const found = getGroupById('non-existent-id');
      
      expect(found).toBeUndefined();
    });
  });

  describe('groupExists', () => {
    it('should return true for existing group', () => {
      initializeDefaultGroups();
      const groups = getGroups();
      
      expect(groupExists(groups[0].id)).toBe(true);
    });

    it('should return false for non-existent group', () => {
      initializeDefaultGroups();
      
      expect(groupExists('non-existent-id')).toBe(false);
    });
  });
});
