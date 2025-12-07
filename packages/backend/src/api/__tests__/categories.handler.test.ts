/**
 * Categories Handler Tests
 * Tests for /categories API endpoints
 */
import { handler } from '../handlers/categories.handler';
import { APIGatewayEvent } from '../types';
import * as eventCategoryService from '../../services/event-category.service';

// Mock the service
jest.mock('../../services/event-category.service');

const mockEventCategoryService = eventCategoryService as jest.Mocked<typeof eventCategoryService>;

function createMockEvent(overrides: Partial<APIGatewayEvent> = {}): APIGatewayEvent {
  return {
    httpMethod: 'GET',
    path: '/categories',
    pathParameters: undefined,
    queryStringParameters: undefined,
    body: undefined,
    headers: {},
    requestContext: {},
    ...overrides,
  };
}

function createMockCategory(overrides: Partial<{
  id: string;
  name: string;
  eventCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}> = {}) {
  return {
    id: 'cat-1',
    name: 'Culto',
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
    eventCount: 0,
    ...overrides,
  };
}

describe('Categories Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  describe('GET /categories', () => {
    it('should return all categories with event counts', async () => {
      const mockCategories = [
        createMockCategory({ id: 'cat-1', name: 'Culto', eventCount: 5 }),
        createMockCategory({ id: 'cat-2', name: 'Kids', eventCount: 3 }),
      ];
      mockEventCategoryService.getCategories.mockReturnValue(mockCategories);
      mockEventCategoryService.initializeDefaultCategories.mockImplementation(() => {});

      const event = createMockEvent({ httpMethod: 'GET', path: '/categories' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockCategories);
      expect(mockEventCategoryService.initializeDefaultCategories).toHaveBeenCalled();
    });
  });

  describe('POST /categories', () => {
    it('should create a new category with valid name', async () => {
      const newCategory = createMockCategory({ id: 'cat-new', name: 'Jovens', isDefault: false });
      mockEventCategoryService.createCategory.mockReturnValue(newCategory);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: JSON.stringify({ name: 'Jovens' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual(newCategory);
      expect(mockEventCategoryService.createCategory).toHaveBeenCalledWith({ name: 'Jovens' });
    });

    it('should return 400 for invalid body', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: 'invalid json',
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).code).toBe('ERR_INVALID_BODY');
    });

    it('should return 400 for empty name', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: JSON.stringify({ name: '   ' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).code).toBe('ERR_EMPTY_NAME');
    });
  });

  describe('GET /categories/{id}', () => {
    it('should return category by ID', async () => {
      const mockCategory = createMockCategory({ eventCount: 5 });
      mockEventCategoryService.getCategoryWithEventCount.mockReturnValue(mockCategory);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockCategory);
    });

    it('should return 404 for non-existent category', async () => {
      mockEventCategoryService.getCategoryWithEventCount.mockImplementation(() => {
        throw new Error('ERR_CATEGORY_NOT_FOUND');
      });

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/categories/invalid-id',
        pathParameters: { id: 'invalid-id' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(404);
    });
  });


  describe('PUT /categories/{id}', () => {
    it('should update category name', async () => {
      const updatedCategory = createMockCategory({ name: 'Culto Atualizado' });
      mockEventCategoryService.updateCategory.mockReturnValue(updatedCategory);

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
        body: JSON.stringify({ name: 'Culto Atualizado' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(updatedCategory);
    });

    it('should return 400 for empty name', async () => {
      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
        body: JSON.stringify({ name: '' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /categories/{id}', () => {
    it('should delete category without events', async () => {
      mockEventCategoryService.deleteCategory.mockImplementation(() => {});

      const event = createMockEvent({
        httpMethod: 'DELETE',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(204);
      expect(mockEventCategoryService.deleteCategory).toHaveBeenCalledWith('cat-1');
    });

    it('should return 400 when category has events', async () => {
      mockEventCategoryService.deleteCategory.mockImplementation(() => {
        throw new Error('ERR_CATEGORY_HAS_EVENTS');
      });

      const event = createMockEvent({
        httpMethod: 'DELETE',
        path: '/categories/cat-with-events',
        pathParameters: { id: 'cat-with-events' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const event = createMockEvent({
        httpMethod: 'PATCH',
        path: '/categories',
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
    });
  });
});
