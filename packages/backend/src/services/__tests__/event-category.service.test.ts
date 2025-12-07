import * as eventCategoryService from '../event-category.service';
import * as eventService from '../event.service';
import { DEFAULT_CATEGORY_NAMES } from '@cantina-pos/shared';

describe('Event Category Service', () => {
  beforeEach(() => {
    eventCategoryService.resetService();
    eventService.resetService();
  });

  describe('initializeDefaultCategories', () => {
    it('should create three default categories: Culto, Kids, Casais', () => {
      eventCategoryService.initializeDefaultCategories();
      
      const categories = eventCategoryService.getCategories();
      
      expect(categories).toHaveLength(3);
      const names = categories.map(c => c.name);
      expect(names).toContain('Culto');
      expect(names).toContain('Kids');
      expect(names).toContain('Casais');
    });

    it('should mark default categories as isDefault=true', () => {
      eventCategoryService.initializeDefaultCategories();
      
      const categories = eventCategoryService.getCategories();
      
      categories.forEach(category => {
        expect(category.isDefault).toBe(true);
      });
    });

    it('should not create duplicates when called multiple times', () => {
      eventCategoryService.initializeDefaultCategories();
      eventCategoryService.initializeDefaultCategories();
      eventCategoryService.initializeDefaultCategories();
      
      const categories = eventCategoryService.getCategories();
      
      expect(categories).toHaveLength(3);
    });
  });

  describe('getCategories', () => {
    it('should return all categories with event counts', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];

      
      // Create an event in the test category
      eventService.createEvent({
        categoryId: testCategory.id,
        name: 'Test Event',
        dates: ['2024-07-15'],
      });
      
      const updatedCategories = eventCategoryService.getCategories();
      const updatedTestCategory = updatedCategories.find(c => c.id === testCategory.id);
      
      expect(updatedTestCategory?.eventCount).toBe(1);
    });

    it('should return empty array when no categories exist', () => {
      const categories = eventCategoryService.getCategories();
      
      expect(categories).toEqual([]);
    });

    it('should return categories sorted by name', () => {
      eventCategoryService.initializeDefaultCategories();
      
      const categories = eventCategoryService.getCategories();
      const names = categories.map(c => c.name);
      
      expect(names).toEqual([...names].sort());
    });
  });

  describe('getCategory', () => {
    it('should return category by ID', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      const category = eventCategoryService.getCategory(testCategory.id);
      
      expect(category.id).toBe(testCategory.id);
      expect(category.name).toBe(testCategory.name);
    });

    it('should throw error for non-existent category', () => {
      expect(() => eventCategoryService.getCategory('non-existent-id'))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('createCategory', () => {
    it('should create a new category with valid name', () => {
      const category = eventCategoryService.createCategory({ name: 'Nova Categoria' });
      
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Nova Categoria');
      expect(category.isDefault).toBe(false);
      expect(category.createdAt).toBeDefined();
      expect(category.updatedAt).toBeDefined();
      expect(category.version).toBe(1);
    });

    it('should trim whitespace from name', () => {
      const category = eventCategoryService.createCategory({ name: '  Categoria Teste  ' });
      
      expect(category.name).toBe('Categoria Teste');
    });

    it('should throw error for empty name', () => {
      expect(() => eventCategoryService.createCategory({ name: '   ' }))
        .toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('updateCategory', () => {
    it('should update category name', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      const updated = eventCategoryService.updateCategory(testCategory.id, { name: 'Nome Atualizado' });
      
      expect(updated.name).toBe('Nome Atualizado');
      expect(updated.id).toBe(testCategory.id);
      expect(updated.version).toBe(testCategory.version + 1);
    });

    it('should not affect existing events when updating category name', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      // Create an event
      const event = eventService.createEvent({
        categoryId: testCategory.id,
        name: 'Test Event',
        dates: ['2024-07-15'],
      });
      
      // Update category name
      eventCategoryService.updateCategory(testCategory.id, { name: 'Nome Atualizado' });
      
      // Event should still reference the same category
      const retrievedEvent = eventService.getEvent(event.id);
      expect(retrievedEvent.categoryId).toBe(testCategory.id);
    });

    it('should throw error for non-existent category', () => {
      expect(() => eventCategoryService.updateCategory('non-existent-id', { name: 'Test' }))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });

    it('should throw error for empty name', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      expect(() => eventCategoryService.updateCategory(testCategory.id, { name: '   ' }))
        .toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category without events', () => {
      const category = eventCategoryService.createCategory({ name: 'Para Deletar' });
      
      eventCategoryService.deleteCategory(category.id);
      
      expect(() => eventCategoryService.getCategory(category.id))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });

    it('should throw error when deleting category with events', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      // Create an event in the category
      eventService.createEvent({
        categoryId: testCategory.id,
        name: 'Test Event',
        dates: ['2024-07-15'],
      });
      
      expect(() => eventCategoryService.deleteCategory(testCategory.id))
        .toThrow('ERR_CATEGORY_HAS_EVENTS');
    });

    it('should throw error for non-existent category', () => {
      expect(() => eventCategoryService.deleteCategory('non-existent-id'))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('getCategoryEventCount', () => {
    it('should return correct event count', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      expect(eventCategoryService.getCategoryEventCount(testCategory.id)).toBe(0);
      
      eventService.createEvent({
        categoryId: testCategory.id,
        name: 'Event 1',
        dates: ['2024-07-15'],
      });
      
      expect(eventCategoryService.getCategoryEventCount(testCategory.id)).toBe(1);
      
      eventService.createEvent({
        categoryId: testCategory.id,
        name: 'Event 2',
        dates: ['2024-07-16'],
      });
      
      expect(eventCategoryService.getCategoryEventCount(testCategory.id)).toBe(2);
    });

    it('should throw error for non-existent category', () => {
      expect(() => eventCategoryService.getCategoryEventCount('non-existent-id'))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('categoryExists', () => {
    it('should return true for existing category', () => {
      eventCategoryService.initializeDefaultCategories();
      const categories = eventCategoryService.getCategories();
      const testCategory = categories[0];
      
      expect(eventCategoryService.categoryExists(testCategory.id)).toBe(true);
    });

    it('should return false for non-existent category', () => {
      expect(eventCategoryService.categoryExists('non-existent-id')).toBe(false);
    });
  });
});
