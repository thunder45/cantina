import { handler } from '../handlers/categories.handler';
import { APIGatewayEvent } from '../types';
import * as eventCategoryService from '../../services/event-category.service';

jest.mock('../../services/event-category.service');
const mockService = eventCategoryService as jest.Mocked<typeof eventCategoryService>;

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

function createMockCategory(overrides: any = {}) {
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
    it('should return all categories', async () => {
      const mockCategories = [createMockCategory({ id: 'cat-1' }), createMockCategory({ id: 'cat-2', name: 'Kids' })];
      mockService.getCategories.mockResolvedValue(mockCategories);
      mockService.initializeDefaultCategories.mockImplementation(() => {});

      const event = createMockEvent({ httpMethod: 'GET', path: '/categories' });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockCategories);
    });
  });

  describe('POST /categories', () => {
    it('should create a new category', async () => {
      const newCategory = createMockCategory({ id: 'cat-new', name: 'Jovens', isDefault: false });
      mockService.createCategory.mockResolvedValue(newCategory);

      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: JSON.stringify({ name: 'Jovens' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual(newCategory);
    });

    it('should return 400 for invalid body', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: 'invalid json',
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for empty name', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        path: '/categories',
        body: JSON.stringify({ name: '   ' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /categories/{id}', () => {
    it('should return category by ID', async () => {
      const mockCategory = createMockCategory({ eventCount: 5 });
      mockService.getCategory.mockResolvedValue(mockCategory);

      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent category', async () => {
      mockService.getCategory.mockRejectedValue(new Error('ERR_CATEGORY_NOT_FOUND'));

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
      mockService.updateCategory.mockResolvedValue(updatedCategory);

      const event = createMockEvent({
        httpMethod: 'PUT',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
        body: JSON.stringify({ name: 'Culto Atualizado' }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
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
    it('should delete category', async () => {
      mockService.deleteCategory.mockResolvedValue(undefined);

      const event = createMockEvent({
        httpMethod: 'DELETE',
        path: '/categories/cat-1',
        pathParameters: { id: 'cat-1' },
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(204);
    });

    it('should return 400 when category has events', async () => {
      mockService.deleteCategory.mockRejectedValue(new Error('ERR_CATEGORY_HAS_EVENTS'));

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
      const event = createMockEvent({ httpMethod: 'PATCH', path: '/categories' });
      const response = await handler(event);

      expect(response.statusCode).toBe(405);
    });
  });
});
