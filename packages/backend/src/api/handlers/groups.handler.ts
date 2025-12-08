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
    if (httpMethod === 'GET' && !id) {
      return await listGroups();
    }
    if (httpMethod === 'POST' && !id) {
      return await createGroup(event);
    }
    if (httpMethod === 'DELETE' && id) {
      return await deleteGroup(id);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function listGroups(): Promise<APIGatewayResponse> {
  const groups = await menuGroupService.getGroups();
  return success(groups);
}

async function createGroup(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CreateGroupBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const nameError = validateName(body.name, 'name');
  if (nameError) return error('ERR_VALIDATION', nameError.message, 400);

  const group = await menuGroupService.createGroup(body.name.trim());
  return created(group);
}

async function deleteGroup(id: string): Promise<APIGatewayResponse> {
  await menuGroupService.deleteGroup(id);
  return noContent();
}
