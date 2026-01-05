import { z } from 'zod';
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateBody } from '../validation';
import { CreateEventSchema } from '../schemas';
import * as eventService from '../../services/event.service';

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'closed']),
});

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
  const v = validateBody(event.body, CreateEventSchema);
  if (!v.success) return v.response;
  const createdEvent = await eventService.createEvent(v.data);
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
  const v = validateBody(event.body, UpdateStatusSchema);
  if (!v.success) return v.response;
  const updatedEvent = await eventService.updateEventStatus(id, v.data.status);
  return success(updatedEvent);
}
