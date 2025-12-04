/**
 * Orders API Handler
 * Endpoints:
 * - POST /orders - Create order
 * - GET /orders/{id} - Get order
 * - PUT /orders/{id}/items - Add/update item in order
 * - DELETE /orders/{id} - Cancel order
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateId, validateQuantity, parseBody, combineValidationErrors } from '../validation';
import * as orderService from '../../services/order.service';

interface CreateOrderBody {
  eventId: string;
}

interface UpdateOrderItemBody {
  menuItemId: string;
  quantity: number;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const orderId = pathParameters?.id;

  try {
    // POST /orders - Create order
    if (httpMethod === 'POST' && !orderId) {
      return createOrder(event);
    }

    // GET /orders/{id} - Get order
    if (httpMethod === 'GET' && orderId) {
      return getOrder(orderId);
    }

    // PUT /orders/{id}/items - Add/update item
    if (httpMethod === 'PUT' && orderId && path.includes('/items')) {
      return updateOrderItem(orderId, event);
    }

    // DELETE /orders/{id}/items/{menuItemId} - Remove item from order
    if (httpMethod === 'DELETE' && orderId && path.includes('/items/')) {
      const menuItemId = pathParameters?.menuItemId;
      if (menuItemId) {
        return removeOrderItem(orderId, menuItemId);
      }
      // /orders/{id}/items/ without menuItemId
      return error('ERR_MISSING_PARAM', 'menuItemId é obrigatório', 400);
    }

    // DELETE /orders/{id}/items (without trailing slash or menuItemId) - Invalid
    if (httpMethod === 'DELETE' && orderId && path.endsWith('/items')) {
      return error('ERR_MISSING_PARAM', 'menuItemId é obrigatório', 400);
    }

    // DELETE /orders/{id} - Cancel order
    if (httpMethod === 'DELETE' && orderId && !path.includes('/items')) {
      return cancelOrder(orderId);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function createOrder(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CreateOrderBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const eventIdError = validateId(body.eventId, 'eventId');
  if (eventIdError) {
    return error('ERR_VALIDATION', eventIdError.message, 400);
  }

  const order = orderService.createOrder(body.eventId);
  return created(order);
}

function getOrder(orderId: string): APIGatewayResponse {
  const order = orderService.getOrder(orderId);
  return success(order);
}

function updateOrderItem(orderId: string, event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<UpdateOrderItemBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const validation = combineValidationErrors(
    validateId(body.menuItemId, 'menuItemId'),
    validateQuantity(body.quantity, 'quantity')
  );

  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(validation.errors.map(e => [e.field, e.message]))
    );
  }

  // Check if item already exists in order
  const order = orderService.getOrder(orderId);
  const existingItem = order.items.find(i => i.menuItemId === body.menuItemId);

  let updatedOrder;
  if (existingItem) {
    // Update quantity
    updatedOrder = orderService.updateItemQuantity(orderId, body.menuItemId, body.quantity);
  } else {
    // Add new item
    updatedOrder = orderService.addItem(orderId, {
      menuItemId: body.menuItemId,
      quantity: body.quantity,
    });
  }

  return success(updatedOrder);
}

function removeOrderItem(orderId: string, menuItemId: string): APIGatewayResponse {
  const order = orderService.removeItem(orderId, menuItemId);
  return success(order);
}

function cancelOrder(orderId: string): APIGatewayResponse {
  orderService.cancelOrder(orderId);
  return noContent();
}
