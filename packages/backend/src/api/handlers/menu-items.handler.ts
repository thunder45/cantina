import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateName, validatePrice, validateStock, validateId, parseBody, combineValidationErrors } from '../validation';
import * as menuItemService from '../../services/menu-item.service';
import { AddMenuItemInput, UpdateMenuItemInput } from '@cantina-pos/shared';

interface AddMenuItemBody {
  catalogItemId: string;
  description: string;
  price: number;
  stock: number;
  groupId: string;
}

interface UpdateMenuItemBody {
  price?: number;
  stock?: number;
}

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
  const body = parseBody<AddMenuItemBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const validation = combineValidationErrors(
    validateId(body.catalogItemId, 'catalogItemId'),
    validateName(body.description, 'description'),
    validatePrice(body.price, 'price'),
    validateStock(body.stock, 'stock'),
    validateId(body.groupId, 'groupId')
  );
  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(validation.errors.map(e => [e.field, e.message])));
  }

  const input: AddMenuItemInput = {
    catalogItemId: body.catalogItemId,
    description: body.description.trim(),
    price: body.price,
    stock: body.stock,
    groupId: body.groupId,
  };
  const item = await menuItemService.addMenuItem(eventId, input);
  return created(item);
}

async function updateMenuItem(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<UpdateMenuItemBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const errors: { field: string; message: string }[] = [];
  if (body.price !== undefined) {
    const priceError = validatePrice(body.price, 'price');
    if (priceError) errors.push(priceError);
  }
  if (body.stock !== undefined) {
    const stockError = validateStock(body.stock, 'stock');
    if (stockError) errors.push(stockError);
  }
  if (errors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(errors.map(e => [e.field, e.message])));
  }

  const updates: UpdateMenuItemInput = {};
  if (body.price !== undefined) updates.price = body.price;
  if (body.stock !== undefined) updates.stock = body.stock;

  const item = await menuItemService.updateMenuItem(id, updates);
  return success(item);
}

async function removeMenuItem(id: string): Promise<APIGatewayResponse> {
  await menuItemService.removeMenuItem(id);
  return noContent();
}
