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
    if (httpMethod === 'POST' && !orderId) {
      return await createOrder(event);
    }
    if (httpMethod === 'GET' && orderId) {
      return await getOrder(orderId);
    }
    if (httpMethod === 'PUT' && orderId && path.includes('/items')) {
      return await updateOrderItem(orderId, event);
    }
    if (httpMethod === 'DELETE' && orderId && path.includes('/items/')) {
      const menuItemId = pathParameters?.menuItemId;
      if (menuItemId) return await removeOrderItem(orderId, menuItemId);
      return error('ERR_MISSING_PARAM', 'menuItemId é obrigatório', 400);
    }
    if (httpMethod === 'DELETE' && orderId && path.endsWith('/items')) {
      return error('ERR_MISSING_PARAM', 'menuItemId é obrigatório', 400);
    }
    if (httpMethod === 'DELETE' && orderId && !path.includes('/items')) {
      return await cancelOrder(orderId);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function createOrder(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CreateOrderBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const eventIdError = validateId(body.eventId, 'eventId');
  if (eventIdError) return error('ERR_VALIDATION', eventIdError.message, 400);

  const order = await orderService.createOrder(body.eventId);
  return created(order);
}

async function getOrder(orderId: string): Promise<APIGatewayResponse> {
  const order = await orderService.getOrder(orderId);
  return success(order);
}

async function updateOrderItem(orderId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<UpdateOrderItemBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const validation = combineValidationErrors(
    validateId(body.menuItemId, 'menuItemId'),
    validateQuantity(body.quantity, 'quantity')
  );
  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(validation.errors.map(e => [e.field, e.message])));
  }

  const order = await orderService.getOrder(orderId);
  const existingItem = order.items.find(i => i.menuItemId === body.menuItemId);

  const updatedOrder = existingItem
    ? await orderService.updateItemQuantity(orderId, body.menuItemId, body.quantity)
    : await orderService.addItem(orderId, { menuItemId: body.menuItemId, quantity: body.quantity });

  return success(updatedOrder);
}

async function removeOrderItem(orderId: string, menuItemId: string): Promise<APIGatewayResponse> {
  const order = await orderService.removeItem(orderId, menuItemId);
  return success(order);
}

async function cancelOrder(orderId: string): Promise<APIGatewayResponse> {
  await orderService.cancelOrder(orderId);
  return noContent();
}
