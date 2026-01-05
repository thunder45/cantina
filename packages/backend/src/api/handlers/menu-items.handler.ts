import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateBody } from '../validation';
import { AddMenuItemSchema, UpdateMenuItemSchema } from '../schemas';
import * as menuItemService from '../../services/menu-item.service';

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const eventId = pathParameters?.id;
  const menuItemId = pathParameters?.menuItemId;

  try {
    if (httpMethod === 'GET' && eventId && path.includes('/menu')) {
      return await listMenuItems(eventId);
    }
    if (httpMethod === 'POST' && eventId && path.includes('/menu')) {
      return await addMenuItem(eventId, event);
    }
    if (httpMethod === 'PUT' && menuItemId) {
      return await updateMenuItem(menuItemId, event);
    }
    if (httpMethod === 'DELETE' && menuItemId) {
      return await removeMenuItem(menuItemId);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function listMenuItems(eventId: string): Promise<APIGatewayResponse> {
  const items = await menuItemService.getMenuItemsByEvent(eventId);
  return success(items);
}

async function addMenuItem(eventId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, AddMenuItemSchema);
  if (!v.success) return v.response;
  const item = await menuItemService.addMenuItem(eventId, v.data);
  return created(item);
}

async function updateMenuItem(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, UpdateMenuItemSchema);
  if (!v.success) return v.response;
  const item = await menuItemService.updateMenuItem(id, v.data);
  return success(item);
}

async function removeMenuItem(id: string): Promise<APIGatewayResponse> {
  await menuItemService.removeMenuItem(id);
  return noContent();
}
