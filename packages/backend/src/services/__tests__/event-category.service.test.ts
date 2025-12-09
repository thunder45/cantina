import * as eventCategoryService from '../event-category.service';
import * as eventService from '../event.service';

describe('Event Category Service', () => {
  beforeEach(() => {
    eventCategoryService.resetRepository();
    eventService.resetService();
  });

  afterEach(() => {
    eventCategoryService.resetRepository();
    eventService.resetService();
  });

  describe('initializeDefaultCategories', () => {
    it('should create three default categories', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      expect(categories).toHaveLength(3);
      expect(categories.map(c => c.name)).toEqual(expect.arrayContaining(['Culto', 'Kids', 'Casais']));
    });

    it('should mark default categories as isDefault=true', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      categories.forEach(c => expect(c.isDefault).toBe(true));
    });

    it('should not create duplicates when called multiple times', async () => {
      await eventCategoryService.initializeDefaultCategories();
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      expect(categories).toHaveLength(3);
    });
  });

  describe('getCategories', () => {
    it('should return all categories with event counts', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      await eventService.createEvent({ categoryId: categories[0].id, name: 'Test', dates: ['2024-07-15'] });
      const updated = await eventCategoryService.getCategories();
      expect(updated.find(c => c.id === categories[0].id)?.eventCount).toBe(1);
    });
  });

  describe('getCategory', () => {
    it('should return category by ID', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      const category = await eventCategoryService.getCategory(categories[0].id);
      expect(category.id).toBe(categories[0].id);
    });

    it('should throw error for non-existent category', async () => {
      await expect(eventCategoryService.getCategory('non-existent')).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const category = await eventCategoryService.createCategory({ name: 'Nova' });
      expect(category.name).toBe('Nova');
      expect(category.isDefault).toBe(false);
    });

    it('should trim whitespace from name', async () => {
      const category = await eventCategoryService.createCategory({ name: '  Test  ' });
      expect(category.name).toBe('Test');
    });

    it('should throw error for empty name', async () => {
      await expect(eventCategoryService.createCategory({ name: '   ' })).rejects.toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      const updated = await eventCategoryService.updateCategory(categories[0].id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('should throw error for non-existent category', async () => {
      await expect(eventCategoryService.updateCategory('non-existent', { name: 'Test' })).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category without events', async () => {
      const category = await eventCategoryService.createCategory({ name: 'ToDelete' });
      await eventCategoryService.deleteCategory(category.id);
      await expect(eventCategoryService.getCategory(category.id)).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });

    it('should throw error when deleting category with events', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      await eventService.createEvent({ categoryId: categories[0].id, name: 'Test', dates: ['2024-07-15'] });
      await expect(eventCategoryService.deleteCategory(categories[0].id)).rejects.toThrow('ERR_CATEGORY_HAS_EVENTS');
    });
  });

  describe('getCategoryEventCount', () => {
    it('should return correct event count via getCategories', async () => {
      await eventCategoryService.initializeDefaultCategories();
      let categories = await eventCategoryService.getCategories();
      expect(categories[0].eventCount).toBe(0);
      await eventService.createEvent({ categoryId: categories[0].id, name: 'E1', dates: ['2024-07-15'] });
      categories = await eventCategoryService.getCategories();
      expect(categories[0].eventCount).toBe(1);
    });
  });

  describe('categoryExists', () => {
    it('should return true for existing category', async () => {
      await eventCategoryService.initializeDefaultCategories();
      const categories = await eventCategoryService.getCategories();
      expect(await eventCategoryService.categoryExists(categories[0].id)).toBe(true);
    });

    it('should return false for non-existent category', async () => {
      expect(await eventCategoryService.categoryExists('non-existent')).toBe(false);
    });
  });
});
