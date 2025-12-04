/**
 * Menu Groups API Handler
 * Endpoints:
 * - GET /groups - List groups
 * - POST /groups - Create group
 * - DELETE /groups/{id} - Delete group
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateName, parseBody } from '../validation';
import * as menuGroupService from '../../services/menu-group.service';

interface CreateGroupBody {
  name: string;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters } = event;
  const id = pathParameters?.id;

  try {
    // GET /groups - List groups
    if (httpMethod === 'GET' && !id) {
      return listGroups();
    }

    // POST /groups - Create group
    if (httpMethod === 'POST' && !id) {
      return createGroup(event);
    }

    // DELETE /groups/{id} - Delete group
    if (httpMethod === 'DELETE' && id) {
      return deleteGroup(id);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function listGroups(): APIGatewayResponse {
  const groups = menuGroupService.getGroups();
  return success(groups);
}

function createGroup(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CreateGroupBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const nameError = validateName(body.name, 'name');
  if (nameError) {
    return error('ERR_VALIDATION', nameError.message, 400);
  }

  const group = menuGroupService.createGroup(body.name.trim());
  return created(group);
}

function deleteGroup(id: string): APIGatewayResponse {
  menuGroupService.deleteGroup(id);
  return noContent();
}
