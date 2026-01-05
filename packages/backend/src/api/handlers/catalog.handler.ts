import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateBody } from '../validation';
import { CreateCatalogItemSchema, UpdateCatalogItemSchema } from '../schemas';
import * as catalogItemService from '../../services/catalog-item.service';

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, queryStringParameters, path } = event;
  const id = pathParameters?.id;

  try {
    if (httpMethod === 'GET' && path.includes('/search')) {
      return await searchCatalogItems(queryStringParameters?.q || '');
    }
    if (httpMethod === 'GET' && !id) {
      return await listCatalogItems(queryStringParameters?.groupId, queryStringParameters?.includeDeleted === 'true');
    }
    if (httpMethod === 'GET' && id) {
      return await getCatalogItem(id);
    }
    if (httpMethod === 'POST' && !id) {
      return await createCatalogItem(event);
    }
    if (httpMethod === 'PUT' && id) {
      return await updateCatalogItem(id, event);
    }
    if (httpMethod === 'DELETE' && id) {
      return await deleteCatalogItem(id);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function listCatalogItems(groupId?: string, includeDeleted = false): Promise<APIGatewayResponse> {
  const items = await catalogItemService.getCatalogItems(groupId, includeDeleted);
  return success(items);
}

async function getCatalogItem(id: string): Promise<APIGatewayResponse> {
  const item = await catalogItemService.getCatalogItemById(id);
  if (!item) return error('ERR_CATALOG_ITEM_NOT_FOUND', 'Item do catálogo não encontrado', 404);
  return success(item);
}

async function searchCatalogItems(query: string): Promise<APIGatewayResponse> {
  const items = await catalogItemService.searchCatalogItems(query);
  return success(items);
}

async function createCatalogItem(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, CreateCatalogItemSchema);
  if (!v.success) return v.response;
  const item = await catalogItemService.createCatalogItem(v.data);
  return created(item);
}

async function updateCatalogItem(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, UpdateCatalogItemSchema);
  if (!v.success) return v.response;
  const item = await catalogItemService.updateCatalogItem(id, v.data);
  return success(item);
}

async function deleteCatalogItem(id: string): Promise<APIGatewayResponse> {
  await catalogItemService.deleteCatalogItem(id);
  return noContent();
}
