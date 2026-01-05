import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, noContent, handleError, error } from '../response';
import { validateBody } from '../validation';
import { CreateGroupSchema } from '../schemas';
import * as menuGroupService from '../../services/menu-group.service';

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
  const v = validateBody(event.body, CreateGroupSchema);
  if (!v.success) return v.response;
  const group = await menuGroupService.createGroup(v.data.name);
  return created(group);
}

async function deleteGroup(id: string): Promise<APIGatewayResponse> {
  await menuGroupService.deleteGroup(id);
  return noContent();
}
