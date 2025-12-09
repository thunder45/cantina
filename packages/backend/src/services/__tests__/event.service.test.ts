import * as eventService from '../event.service';
import * as eventCategoryService from '../event-category.service';

describe('Event Service', () => {
  let testCategoryId: string;

  beforeEach(async () => {
    eventService.resetService();
    eventCategoryService.resetRepository();
    await eventCategoryService.initializeDefaultCategories();
    const categories = await eventCategoryService.getCategories();
    testCategoryId = categories[0].id;
  });

  describe('createEvent', () => {
    it('should create an event with valid input', async () => {
      const event = await eventService.createEvent({
        categoryId: testCategoryId,
        name: 'Festival de Verão',
        dates: ['2024-07-15', '2024-07-16'],
      });
      expect(event.name).toBe('Festival de Verão');
      expect(event.dates).toEqual(['2024-07-15', '2024-07-16']);
      expect(event.status).toBe('active');
    });

    it('should trim whitespace from name', async () => {
      const event = await eventService.createEvent({ categoryId: testCategoryId, name: '  Evento  ', dates: ['2024-07-15'] });
      expect(event.name).toBe('Evento');
    });

    it('should throw error for empty name', async () => {
      await expect(eventService.createEvent({ categoryId: testCategoryId, name: '   ', dates: ['2024-07-15'] })).rejects.toThrow('ERR_EMPTY_NAME');
    });

    it('should throw error for empty dates array', async () => {
      await expect(eventService.createEvent({ categoryId: testCategoryId, name: 'Evento', dates: [] })).rejects.toThrow('ERR_INVALID_DATES');
    });

    it('should throw error for invalid date format', async () => {
      await expect(eventService.createEvent({ categoryId: testCategoryId, name: 'Evento', dates: ['not-a-date'] })).rejects.toThrow('ERR_INVALID_DATE_FORMAT');
    });

    it('should throw error for non-existent category', async () => {
      await expect(eventService.createEvent({ categoryId: 'non-existent', name: 'Evento', dates: ['2024-07-15'] })).rejects.toThrow('ERR_CATEGORY_NOT_FOUND');
    });
  });

  describe('getEvent', () => {
    it('should return event by ID', async () => {
      const created = await eventService.createEvent({ categoryId: testCategoryId, name: 'Test', dates: ['2024-07-15'] });
      const event = await eventService.getEvent(created.id);
      expect(event.id).toBe(created.id);
    });

    it('should throw error for non-existent event', async () => {
      await expect(eventService.getEvent('non-existent')).rejects.toThrow('ERR_EVENT_NOT_FOUND');
    });
  });

  describe('getEvents', () => {
    it('should return all events', async () => {
      await eventService.createEvent({ categoryId: testCategoryId, name: 'Event1', dates: ['2024-07-15'] });
      await eventService.createEvent({ categoryId: testCategoryId, name: 'Event2', dates: ['2024-07-16'] });
      const events = await eventService.getEvents();
      expect(events).toHaveLength(2);
    });

    it('should filter by category using getEventsByCategory', async () => {
      const categories = await eventCategoryService.getCategories();
      await eventService.createEvent({ categoryId: categories[0].id, name: 'Event1', dates: ['2024-07-15'] });
      await eventService.createEvent({ categoryId: categories[1].id, name: 'Event2', dates: ['2024-07-16'] });
      const events = await eventService.getEventsByCategory(categories[0].id);
      expect(events).toHaveLength(1);
    });
  });

  describe('updateEventStatus', () => {
    it('should update event status', async () => {
      const event = await eventService.createEvent({ categoryId: testCategoryId, name: 'Test', dates: ['2024-07-15'] });
      const updated = await eventService.updateEventStatus(event.id, 'closed');
      expect(updated.status).toBe('closed');
    });
  });

  describe('eventExists', () => {
    it('should return true for existing event', async () => {
      const event = await eventService.createEvent({ categoryId: testCategoryId, name: 'Test', dates: ['2024-07-15'] });
      expect(await eventService.eventExists(event.id)).toBe(true);
    });

    it('should return false for non-existent event', async () => {
      expect(await eventService.eventExists('non-existent')).toBe(false);
    });
  });
});
