/**
 * Router Tests
 * Verifies route matching and ordering
 */
import { router } from '../router';
import { APIGatewayEvent } from '../types';

// Helper to create mock event
function createEvent(method: string, path: string, body?: object): APIGatewayEvent {
  return {
    httpMethod: method,
    path,
    pathParameters: {},
    queryStringParameters: {},
    body: body ? JSON.stringify(body) : undefined,
    headers: {},
    requestContext: {
      authorizer: {
        claims: { sub: 'test-user' },
      },
    },
  };
}

describe('Router', () => {
  describe('Route Matching Order', () => {
    it('should match /events/{id}/report/export before /events/{id}/report', async () => {
      // This test verifies that more specific routes are matched first
      const exportEvent = createEvent('GET', '/events/123/report/export');
      const reportEvent = createEvent('GET', '/events/123/report');

      // Both should return 404 (event not found) but NOT method not allowed
      // This proves the correct handler was matched
      const exportResponse = await router(exportEvent);
      const reportResponse = await router(reportEvent);

      // Both should hit the reports handler (404 because event doesn't exist)
      expect(exportResponse.statusCode).toBe(404);
      expect(reportResponse.statusCode).toBe(404);
      
      // Verify they're hitting the right handler by checking error code
      const exportBody = JSON.parse(exportResponse.body);
      const reportBody = JSON.parse(reportResponse.body);
      expect(exportBody.code).toBe('ERR_EVENT_NOT_FOUND');
      expect(reportBody.code).toBe('ERR_EVENT_NOT_FOUND');
    });

    it('should match /catalog/search before /catalog/{id}', async () => {
      const searchEvent = createEvent('GET', '/catalog/search');
      const response = await router(searchEvent);
      
      // Should return 200 with empty array (not 404 for catalog item)
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should match /customers/search before /customers/{id}', async () => {
      const searchEvent = createEvent('GET', '/customers/search');
      const response = await router(searchEvent);
      
      // Should return 200 with array (not 404 for customer)
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests for CORS preflight', async () => {
      const event = createEvent('OPTIONS', '/events');
      const response = await router(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toContain('GET');
      expect(response.headers['Access-Control-Allow-Methods']).toContain('POST');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const event = createEvent('GET', '/unknown/route');
      const response = await router(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('ERR_NOT_FOUND');
    });
  });

  describe('Edge Cases', () => {
    it('should return 400 for DELETE /orders/{id}/items without menuItemId', async () => {
      const event = createEvent('DELETE', '/orders/123/items');
      const response = await router(event);

      // Should return 400 (missing param) not 405 (method not allowed)
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('ERR_MISSING_PARAM');
    });
  });
});
