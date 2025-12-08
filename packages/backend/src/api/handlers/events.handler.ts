import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateName, validateNonEmptyArray, validateId, parseBody, combineValidationErrors } from '../validation';
import * as eventService from '../../services/event.service';
import { CreateEventInput } from '@cantina-pos/shared';

interface CreateEventBody {
  categoryId: string;
  name: string;
  dates: string[];
  categories?: string[];
}

interface UpdateStatusBody {
  status: 'active' | 'closed';
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const id = pathParameters?.id;

  try {
    if (httpMethod === 'GET' && id && path.includes('/categories/')) {
      return await getEventsByCategory(id);
    }
    if (httpMethod === 'POST' && !id) {
      return await createEvent(event);
    }
    if (httpMethod === 'GET' && !id) {
      return await listEvents();
    }
    if (httpMethod === 'GET' && id && !path.includes('/status')) {
      return await getEvent(id);
    }
    if (httpMethod === 'PATCH' && id && path.includes('/status')) {
      return await updateEventStatus(id, event);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function createEvent(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CreateEventBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const validation = combineValidationErrors(
    validateId(body.categoryId, 'categoryId'),
    validateName(body.name, 'name'),
    validateNonEmptyArray(body.dates, 'dates')
  );
  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(validation.errors.map(e => [e.field, e.message])));
  }

  const input: CreateEventInput = {
    categoryId: body.categoryId,
    name: body.name.trim(),
    dates: body.dates,
    categories: body.categories,
  };
  const createdEvent = await eventService.createEvent(input);
  return created(createdEvent);
}

async function getEventsByCategory(categoryId: string): Promise<APIGatewayResponse> {
  const events = await eventService.getEventsByCategory(categoryId);
  return success(events);
}

async function listEvents(): Promise<APIGatewayResponse> {
  const events = await eventService.getEvents();
  return success(events);
}

async function getEvent(id: string): Promise<APIGatewayResponse> {
  const event = await eventService.getEvent(id);
  return success(event);
}

async function updateEventStatus(id: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<UpdateStatusBody>(event.body);
  if (!body || !['active', 'closed'].includes(body.status)) {
    return error('ERR_INVALID_STATUS', 'Status deve ser "active" ou "closed"', 400);
  }
  const updatedEvent = await eventService.updateEventStatus(id, body.status);
  return success(updatedEvent);
}
