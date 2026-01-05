import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateBody } from '../validation';
import { CreateOrderSchema, UpdateOrderItemSchema } from '../schemas';
import * as orderService from '../../services/order.service';

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
  const v = validateBody(event.body, CreateOrderSchema);
  if (!v.success) return v.response;
  const order = await orderService.createOrder(v.data.eventId);
  return created(order);
}

async function getOrder(orderId: string): Promise<APIGatewayResponse> {
  const order = await orderService.getOrder(orderId);
  return success(order);
}

async function updateOrderItem(orderId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, UpdateOrderItemSchema);
  if (!v.success) return v.response;

  const order = await orderService.getOrder(orderId);
  const existingItem = order.items.find(i => i.menuItemId === v.data.menuItemId);

  const updatedOrder = existingItem
    ? await orderService.updateItemQuantity(orderId, v.data.menuItemId, v.data.quantity)
    : await orderService.addItem(orderId, { menuItemId: v.data.menuItemId, quantity: v.data.quantity });

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
