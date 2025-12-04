/**
 * Events API Handler
 * Endpoints:
 * - POST /events - Create event
 * - GET /events - List events
 * - GET /events/{id} - Get event by ID
 * - PATCH /events/{id}/status - Update event status
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateName, validateNonEmptyArray, parseBody, combineValidationErrors } from '../validation';
import * as eventService from '../../services/event.service';
import { CreateEventInput } from '@cantina-pos/shared';

interface CreateEventBody {
  name: string;
  dates: string[];
  categories: string[];
}

interface UpdateStatusBody {
  status: 'active' | 'closed';
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters } = event;
  const id = pathParameters?.id;
  const path = event.path;

  try {
    // POST /events - Create event
    if (httpMethod === 'POST' && !id) {
      return createEvent(event);
    }

    // GET /events - List events
    if (httpMethod === 'GET' && !id) {
      return listEvents();
    }

    // GET /events/{id} - Get event
    if (httpMethod === 'GET' && id && !path.includes('/status')) {
      return getEvent(id);
    }

    // PATCH /events/{id}/status - Update status
    if (httpMethod === 'PATCH' && id && path.includes('/status')) {
      return updateEventStatus(id, event);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function createEvent(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CreateEventBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const validation = combineValidationErrors(
    validateName(body.name, 'name'),
    validateNonEmptyArray(body.dates, 'dates'),
    validateNonEmptyArray(body.categories, 'categories')
  );

  if (!validation.valid) {
    return error('ERR_VALIDATION', 'Erro de validação', 400, 
      Object.fromEntries(validation.errors.map(e => [e.field, e.message]))
    );
  }

  const input: CreateEventInput = {
    name: body.name.trim(),
    dates: body.dates,
    categories: body.categories,
  };

  const createdEvent = eventService.createEvent(input);
  return created(createdEvent);
}

function listEvents(): APIGatewayResponse {
  const events = eventService.getEvents();
  return success(events);
}

function getEvent(id: string): APIGatewayResponse {
  const event = eventService.getEvent(id);
  return success(event);
}

function updateEventStatus(id: string, event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<UpdateStatusBody>(event.body);
  if (!body || !['active', 'closed'].includes(body.status)) {
    return error('ERR_INVALID_STATUS', 'Status deve ser "active" ou "closed"', 400);
  }

  const updatedEvent = eventService.updateEventStatus(id, body.status);
  return success(updatedEvent);
}
