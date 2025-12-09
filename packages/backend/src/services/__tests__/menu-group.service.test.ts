import * as menuGroupService from '../menu-group.service';

describe('MenuGroupService', () => {
  beforeEach(() => {
    menuGroupService.resetService();
  });

  describe('initializeDefaultGroups', () => {
    it('should create three default groups', async () => {
      const groups = await menuGroupService.initializeDefaultGroups();
      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.name)).toEqual(['Refeição', 'Bebida', 'Sobremesa']);
      expect(groups.every(g => g.isDefault)).toBe(true);
    });

    it('should return existing groups on subsequent calls', async () => {
      const first = await menuGroupService.initializeDefaultGroups();
      const second = await menuGroupService.initializeDefaultGroups();
      expect(first).toEqual(second);
    });
  });

  describe('getGroups', () => {
    it('should return all groups sorted by order', async () => {
      await menuGroupService.initializeDefaultGroups();
      const groups = await menuGroupService.getGroups();
      expect(groups).toHaveLength(3);
      expect(groups[0].order).toBeLessThan(groups[1].order);
    });

    it('should auto-initialize default groups if not initialized', async () => {
      const groups = await menuGroupService.getGroups();
      expect(groups).toHaveLength(3);
    });
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      await menuGroupService.initializeDefaultGroups();
      const newGroup = await menuGroupService.createGroup('Lanches');
      expect(newGroup.name).toBe('Lanches');
      expect(newGroup.isDefault).toBe(false);
    });

    it('should throw error for empty name', async () => {
      await expect(menuGroupService.createGroup('')).rejects.toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for duplicate name', async () => {
      await menuGroupService.initializeDefaultGroups();
      await expect(menuGroupService.createGroup('Refeição')).rejects.toThrow('ERR_DUPLICATE_NAME');
    });

    it('should trim whitespace from name', async () => {
      const group = await menuGroupService.createGroup('  Lanches  ');
      expect(group.name).toBe('Lanches');
    });
  });

  describe('deleteGroup', () => {
    it('should delete group without associated items', async () => {
      await menuGroupService.initializeDefaultGroups();
      const newGroup = await menuGroupService.createGroup('Lanches');
      await menuGroupService.deleteGroup(newGroup.id);
      expect(await menuGroupService.groupExists(newGroup.id)).toBe(false);
    });

    it('should throw error when deleting group with associated items', async () => {
      await menuGroupService.initializeDefaultGroups();
      const groups = await menuGroupService.getGroups();
      menuGroupService.setMenuItemsChecker((groupId) => groupId === groups[0].id);
      await expect(menuGroupService.deleteGroup(groups[0].id)).rejects.toThrow('ERR_GROUP_HAS_ITEMS');
    });

    it('should throw error for non-existent group', async () => {
      await expect(menuGroupService.deleteGroup('non-existent')).rejects.toThrow('ERR_GROUP_NOT_FOUND');
    });
  });

  describe('getGroupById', () => {
    it('should return group by ID', async () => {
      await menuGroupService.initializeDefaultGroups();
      const groups = await menuGroupService.getGroups();
      const found = await menuGroupService.getGroupById(groups[0].id);
      expect(found?.id).toBe(groups[0].id);
    });

    it('should return undefined for non-existent ID', async () => {
      const found = await menuGroupService.getGroupById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('groupExists', () => {
    it('should return true for existing group', async () => {
      await menuGroupService.initializeDefaultGroups();
      const groups = await menuGroupService.getGroups();
      expect(await menuGroupService.groupExists(groups[0].id)).toBe(true);
    });

    it('should return false for non-existent group', async () => {
      expect(await menuGroupService.groupExists('non-existent')).toBe(false);
    });
  });
});
