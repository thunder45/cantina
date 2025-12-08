import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';

export async function createEvent(input: CreateEventInput): Promise<Event> {
  if (!await eventCategoryRepository.categoryExists(input.categoryId)) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  return eventRepository.createEvent(input);
}

export async function getEventsByCategory(categoryId: string): Promise<Event[]> {
  if (!await eventCategoryRepository.categoryExists(categoryId)) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  return eventRepository.getEventsByCategory(categoryId);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return eventRepository.getEventById(id);
}

export async function getEvent(id: string): Promise<Event> {
  const event = await eventRepository.getEventById(id);
  if (!event) throw new Error('ERR_EVENT_NOT_FOUND');
  return event;
}

export async function getEvents(): Promise<Event[]> {
  return eventRepository.getEvents();
}

export async function updateEventStatus(id: string, status: 'active' | 'closed'): Promise<Event> {
  return eventRepository.updateEventStatus(id, { status });
}

export async function eventExists(id: string): Promise<boolean> {
  return eventRepository.eventExists(id);
}

export function resetService(): void {
  eventRepository.resetRepository();
}
