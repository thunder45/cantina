/**
 * Categories API Handler
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { parseBody, validateName } from '../validation';
import * as eventCategoryService from '../../services/event-category.service';

interface CategoryBody {
  name: string;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters } = event;
  const categoryId = pathParameters?.id;

  try {
    if (httpMethod === 'GET' && !categoryId) {
      return await getCategories();
    }
    if (httpMethod === 'POST' && !categoryId) {
      return await createCategory(event);
    }
    if (httpMethod === 'GET' && categoryId) {
      return await getCategory(categoryId);
    }
    if (httpMethod === 'PUT' && categoryId) {
      return await updateCategory(categoryId, event);
    }
    if (httpMethod === 'DELETE' && categoryId) {
      return await deleteCategory(categoryId);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function getCategories(): Promise<APIGatewayResponse> {
  eventCategoryService.initializeDefaultCategories();
  const categories = await eventCategoryService.getCategories();
  return success(categories);
}

async function createCategory(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CategoryBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }
  const nameError = validateName(body.name, 'nome');
  if (nameError) {
    return error('ERR_EMPTY_NAME', nameError.message, 400);
  }
  const category = await eventCategoryService.createCategory({ name: body.name });
  return created(category);
}

async function getCategory(id: string): Promise<APIGatewayResponse> {
  const category = await eventCategoryService.getCategory(id);
  return success(category);
}

async function updateCategory(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CategoryBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }
  const nameError = validateName(body.name, 'nome');
  if (nameError) {
    return error('ERR_EMPTY_NAME', nameError.message, 400);
  }
  const category = await eventCategoryService.updateCategory(id, { name: body.name });
  return success(category);
}

async function deleteCategory(id: string): Promise<APIGatewayResponse> {
  await eventCategoryService.deleteCategory(id);
  return noContent();
}
