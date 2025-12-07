/**
 * Categories API Handler
 * Endpoints:
 * - GET /categories - List all categories with event counts
 * - POST /categories - Create a new category
 * - GET /categories/{id} - Get category by ID
 * - PUT /categories/{id} - Update category
 * - DELETE /categories/{id} - Delete category (fails if has events)
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
    // GET /categories - List all categories
    if (httpMethod === 'GET' && !categoryId) {
      return getCategories();
    }

    // POST /categories - Create category
    if (httpMethod === 'POST' && !categoryId) {
      return createCategory(event);
    }

    // GET /categories/{id} - Get category by ID
    if (httpMethod === 'GET' && categoryId) {
      return getCategory(categoryId);
    }

    // PUT /categories/{id} - Update category
    if (httpMethod === 'PUT' && categoryId) {
      return updateCategory(categoryId, event);
    }

    // DELETE /categories/{id} - Delete category
    if (httpMethod === 'DELETE' && categoryId) {
      return deleteCategory(categoryId);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}


/**
 * GET /categories - List all categories with event counts
 * Requirements: 1.2
 */
function getCategories(): APIGatewayResponse {
  // Initialize default categories if needed
  eventCategoryService.initializeDefaultCategories();
  
  const categories = eventCategoryService.getCategories();
  return success(categories);
}

/**
 * POST /categories - Create a new category
 * Requirements: 1.3
 */
function createCategory(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CategoryBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const nameError = validateName(body.name, 'nome');
  if (nameError) {
    return error('ERR_EMPTY_NAME', nameError.message, 400);
  }

  const category = eventCategoryService.createCategory({ name: body.name.trim() });
  return created(category);
}

/**
 * GET /categories/{id} - Get category by ID
 */
function getCategory(categoryId: string): APIGatewayResponse {
  const category = eventCategoryService.getCategoryWithEventCount(categoryId);
  return success(category);
}

/**
 * PUT /categories/{id} - Update category
 * Requirements: 1.4
 */
function updateCategory(categoryId: string, event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CategoryBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const nameError = validateName(body.name, 'nome');
  if (nameError) {
    return error('ERR_EMPTY_NAME', nameError.message, 400);
  }

  const category = eventCategoryService.updateCategory(categoryId, { name: body.name.trim() });
  return success(category);
}

/**
 * DELETE /categories/{id} - Delete category
 * Requirements: 1.5, 1.6
 */
function deleteCategory(categoryId: string): APIGatewayResponse {
  eventCategoryService.deleteCategory(categoryId);
  return noContent();
}
