import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import * as eventRepository from '../repositories/event.repository';

/**
 * Create a new event
 * Requirements: 1.1, 1.2, 1.3
 * @param input - Event data with name, dates, and categories
 * @returns Created Event
 * @throws Error if validation fails
 */
export function createEvent(input: CreateEventInput): Event {
  return eventRepository.createEvent(input);
}

/**
 * Get an event by ID
 * @param id - Event ID
 * @returns Event or undefined
 */
export function getEventById(id: string): Event | undefined {
  return eventRepository.getEventById(id);
}

/**
 * Get an event by ID (throws if not found)
 * @param id - Event ID
 * @returns Event
 * @throws Error if event not found
 */
export function getEvent(id: string): Event {
  const event = eventRepository.getEventById(id);
  if (!event) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  return event;
}

/**
 * Get all events
 * Requirements: 1.4
 * @returns Array of Events sorted by creation date (newest first)
 */
export function getEvents(): Event[] {
  return eventRepository.getEvents();
}

/**
 * Update event status
 * Requirements: 1.4
 * @param id - Event ID
 * @param status - New status ('active' or 'closed')
 * @returns Updated Event
 * @throws Error if event not found
 */
export function updateEventStatus(id: string, status: 'active' | 'closed'): Event {
  return eventRepository.updateEventStatus(id, { status });
}

/**
 * Check if an event exists
 * @param id - Event ID
 * @returns true if event exists
 */
export function eventExists(id: string): boolean {
  return eventRepository.eventExists(id);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  eventRepository.resetRepository();
}
