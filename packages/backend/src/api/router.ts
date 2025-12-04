/**
 * API Router - Routes requests to appropriate handlers
 */
import { APIGatewayEvent, APIGatewayResponse } from './types';
import { error } from './response';

import * as eventsHandler from './handlers/events.handler';
import * as groupsHandler from './handlers/groups.handler';
import * as catalogHandler from './handlers/catalog.handler';
import * as menuItemsHandler from './handlers/menu-items.handler';
import * as ordersHandler from './handlers/orders.handler';
import * as salesHandler from './handlers/sales.handler';
import * as customersHandler from './handlers/customers.handler';
import * as reportsHandler from './handlers/reports.handler';

/**
 * Parse path parameters from path
 */
function parsePathParams(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith('{') && patternParts[i].endsWith('}')) {
      const paramName = patternParts[i].slice(1, -1);
      params[paramName] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * Match path against patterns and return handler with params
 */
function matchRoute(path: string): { handler: string; params: Record<string, string> } | null {
  const routes = [
    // Events
    { pattern: '/events', handler: 'events' },
    { pattern: '/events/{id}', handler: 'events' },
    { pattern: '/events/{id}/status', handler: 'events' },
    { pattern: '/events/{id}/menu', handler: 'menuItems' },
    { pattern: '/events/{id}/sales', handler: 'sales' },
    { pattern: '/events/{id}/report', handler: 'reports' },
    { pattern: '/events/{id}/report/export', handler: 'reports' },
    { pattern: '/events/{id}/stock-report', handler: 'reports' },
    
    // Groups
    { pattern: '/groups', handler: 'groups' },
    { pattern: '/groups/{id}', handler: 'groups' },
    
    // Catalog
    { pattern: '/catalog', handler: 'catalog' },
    { pattern: '/catalog/search', handler: 'catalog' },
    { pattern: '/catalog/{id}', handler: 'catalog' },
    
    // Menu Items
    { pattern: '/menu/{menuItemId}', handler: 'menuItems' },
    
    // Orders
    { pattern: '/orders', handler: 'orders' },
    { pattern: '/orders/{id}', handler: 'orders' },
    { pattern: '/orders/{id}/items', handler: 'orders' },
    { pattern: '/orders/{id}/items/{menuItemId}', handler: 'orders' },
    
    // Sales
    { pattern: '/sales', handler: 'sales' },
    { pattern: '/sales/{saleId}', handler: 'sales' },
    { pattern: '/sales/{saleId}/receipt', handler: 'sales' },
    { pattern: '/sales/{saleId}/refund', handler: 'sales' },
    
    // Customers
    { pattern: '/customers', handler: 'customers' },
    { pattern: '/customers/search', handler: 'customers' },
    { pattern: '/customers/{id}', handler: 'customers' },
    { pattern: '/customers/{id}/balance', handler: 'customers' },
    { pattern: '/customers/{id}/history', handler: 'customers' },
    { pattern: '/customers/{id}/payments', handler: 'customers' },
  ];

  // Sort routes by specificity (more specific patterns first)
  const sortedRoutes = [...routes].sort((a, b) => {
    const aSpecificity = a.pattern.split('/').filter(p => !p.startsWith('{')).length;
    const bSpecificity = b.pattern.split('/').filter(p => !p.startsWith('{')).length;
    return bSpecificity - aSpecificity;
  });

  for (const route of sortedRoutes) {
    const params = parsePathParams(path, route.pattern);
    if (params !== null) {
      return { handler: route.handler, params };
    }
  }

  return null;
}

/**
 * Handle OPTIONS requests for CORS
 */
function handleOptions(): APIGatewayResponse {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: '',
  };
}

/**
 * Main router handler
 */
export async function router(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const route = matchRoute(event.path);
  
  if (!route) {
    return error('ERR_NOT_FOUND', 'Endpoint não encontrado', 404);
  }

  // Inject path parameters
  event.pathParameters = { ...event.pathParameters, ...route.params };

  // Route to appropriate handler
  switch (route.handler) {
    case 'events':
      return eventsHandler.handler(event);
    case 'groups':
      return groupsHandler.handler(event);
    case 'catalog':
      return catalogHandler.handler(event);
    case 'menuItems':
      return menuItemsHandler.handler(event);
    case 'orders':
      return ordersHandler.handler(event);
    case 'sales':
      return salesHandler.handler(event);
    case 'customers':
      return customersHandler.handler(event);
    case 'reports':
      return reportsHandler.handler(event);
    default:
      return error('ERR_NOT_FOUND', 'Endpoint não encontrado', 404);
  }
}
