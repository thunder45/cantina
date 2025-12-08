import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateName, validatePrice, validateId, parseBody, combineValidationErrors } from '../validation';
import * as catalogItemService from '../../services/catalog-item.service';
import { CreateCatalogItemInput, UpdateCatalogItemInput } from '@cantina-pos/shared';

interface CreateCatalogItemBody {
  description: string;
  suggestedPrice: number;
  groupId: string;
}

interface UpdateCatalogItemBody {
  description?: string;
  suggestedPrice?: number;
  groupId?: string;
}

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
  const body = parseBody<CreateCatalogItemBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const validation = combineValidationErrors(
    validateName(body.description, 'description'),
    validatePrice(body.suggestedPrice, 'suggestedPrice'),
    validateId(body.groupId, 'groupId')
  );
  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(validation.errors.map(e => [e.field, e.message])));
  }

  const input: CreateCatalogItemInput = {
    description: body.description.trim(),
    suggestedPrice: body.suggestedPrice,
    groupId: body.groupId,
  };
  const item = await catalogItemService.createCatalogItem(input);
  return created(item);
}

async function updateCatalogItem(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<UpdateCatalogItemBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const errors: { field: string; message: string }[] = [];
  if (body.description !== undefined) {
    const descError = validateName(body.description, 'description');
    if (descError) errors.push(descError);
  }
  if (body.suggestedPrice !== undefined) {
    const priceError = validatePrice(body.suggestedPrice, 'suggestedPrice');
    if (priceError) errors.push(priceError);
  }
  if (body.groupId !== undefined) {
    const groupError = validateId(body.groupId, 'groupId');
    if (groupError) errors.push(groupError);
  }
  if (errors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(errors.map(e => [e.field, e.message])));
  }

  const updates: UpdateCatalogItemInput = {};
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.suggestedPrice !== undefined) updates.suggestedPrice = body.suggestedPrice;
  if (body.groupId !== undefined) updates.groupId = body.groupId;

  const item = await catalogItemService.updateCatalogItem(id, updates);
  return success(item);
}

async function deleteCatalogItem(id: string): Promise<APIGatewayResponse> {
  await catalogItemService.deleteCatalogItem(id);
  return noContent();
}
