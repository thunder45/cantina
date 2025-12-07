import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';

describe('Event Service', () => {
  let testCategoryId: string;

  beforeEach(() => {
    eventService.resetService();
    eventCategoryService.resetService();
    // Initialize default categories and get one for testing
    eventCategoryService.initializeDefaultCategories();
    const categories = eventCategoryService.getCategories();
    testCategoryId = categories[0].id;
  });

  describe('createEvent', () => {
    it('should create an event with valid input', () => {
      const input = {
        categoryId: testCategoryId,
        name: 'Festival de Verão',
        dates: ['2024-07-15', '2024-07-16'],
        categories: ['Comida', 'Bebida'],
      };

      const event = eventService.createEvent(input);

      expect(event.id).toBeDefined();
      expect(event.categoryId).toBe(testCategoryId);
      expect(event.name).toBe('Festival de Verão');
      expect(event.dates).toEqual(['2024-07-15', '2024-07-16']);
      expect(event.categories).toEqual(['Comida', 'Bebida']);
      expect(event.status).toBe('active');
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('should support multiple non-sequential dates', () => {
      const input = {
        categoryId: testCategoryId,
        name: 'Evento Especial',
        dates: ['2024-07-01', '2024-07-15', '2024-08-01'],
        categories: [],
      };

      const event = eventService.createEvent(input);

      expect(event.dates).toHaveLength(3);
      expect(event.dates).toEqual(['2024-07-01', '2024-07-15', '2024-08-01']);
    });

    it('should trim whitespace from name', () => {
      const input = {
        categoryId: testCategoryId,
        name: '  Evento Teste  ',
        dates: ['2024-07-15'],
        categories: [],
      };

      const event = eventService.createEvent(input);

      expect(event.name).toBe('Evento Teste');
    });


    it('should throw error for empty name', () => {
      const input = {
        categoryId: testCategoryId,
        name: '   ',
        dates: ['2024-07-15'],
        categories: [],
      };

      expect(() => eventService.createEvent(input)).toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for empty dates array', () => {
      const input = {
        categoryId: testCategoryId,
        name: 'Evento',
        dates: [],
        categories: [],
      };

      expect(() => eventService.createEvent(input)).toThrow('ERR_INVALID_DATES');
    });

    it('should throw error for invalid date format', () => {
      const input = {
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['not-a-date'],
        categories: [],
      };

      expect(() => eventService.createEvent(input)).toThrow('ERR_INVALID_DATE_FORMAT');
    });

    it('should throw error for non-existent category', () => {
      const input = {
        categoryId: 'non-existent-category',
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      };

      expect(() => eventService.createEvent(input)).toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('getEvent', () => {
    it('should return event by ID', () => {
      const created = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      });

      const event = eventService.getEvent(created.id);

      expect(event).toEqual(created);
    });

    it('should throw error for non-existent event', () => {
      expect(() => eventService.getEvent('non-existent-id')).toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', () => {
      const created = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      });

      const event = eventService.getEventById(created.id);

      expect(event).toEqual(created);
    });

    it('should return undefined for non-existent event', () => {
      const event = eventService.getEventById('non-existent-id');

      expect(event).toBeUndefined();
    });
  });

  describe('getEvents', () => {
    it('should return all events', () => {
      const event1 = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento 1',
        dates: ['2024-07-15'],
        categories: [],
      });

      const event2 = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento 2',
        dates: ['2024-07-16'],
        categories: [],
      });

      const events = eventService.getEvents();

      expect(events).toHaveLength(2);
      const eventIds = events.map(e => e.id);
      expect(eventIds).toContain(event1.id);
      expect(eventIds).toContain(event2.id);
    });

    it('should return empty array when no events exist', () => {
      const events = eventService.getEvents();

      expect(events).toEqual([]);
    });
  });

  describe('getEventsByCategory', () => {
    it('should return events for a specific category', () => {
      const categories = eventCategoryService.getCategories();
      const category1 = categories[0];
      const category2 = categories[1];

      const event1 = eventService.createEvent({
        categoryId: category1.id,
        name: 'Evento Cat 1',
        dates: ['2024-07-15'],
      });

      eventService.createEvent({
        categoryId: category2.id,
        name: 'Evento Cat 2',
        dates: ['2024-07-16'],
      });

      const events = eventService.getEventsByCategory(category1.id);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event1.id);
    });

    it('should throw error for non-existent category', () => {
      expect(() => eventService.getEventsByCategory('non-existent-id'))
        .toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status to closed', () => {
      const created = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      });

      const updated = eventService.updateEventStatus(created.id, 'closed');

      expect(updated.status).toBe('closed');
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(created.name);
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update event status to active', () => {
      const created = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      });

      eventService.updateEventStatus(created.id, 'closed');
      const updated = eventService.updateEventStatus(created.id, 'active');

      expect(updated.status).toBe('active');
    });

    it('should throw error for non-existent event', () => {
      expect(() => eventService.updateEventStatus('non-existent-id', 'closed'))
        .toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('eventExists', () => {
    it('should return true for existing event', () => {
      const created = eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Evento',
        dates: ['2024-07-15'],
        categories: [],
      });

      expect(eventService.eventExists(created.id)).toBe(true);
    });

    it('should return false for non-existent event', () => {
      expect(eventService.eventExists('non-existent-id')).toBe(false);
    });
  });
});
