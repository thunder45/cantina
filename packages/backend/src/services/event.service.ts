import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';

/**
 * Create a new event
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * @param input - Event data with categoryId, name, and dates
 * @returns Created Event
 * @throws Error if validation fails or category not found
 */
export function createEvent(input: CreateEventInput): Event {
  // Validate category exists (Requirements: 2.2)
  if (!eventCategoryRepository.categoryExists(input.categoryId)) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  return eventRepository.createEvent(input);
}

/**
 * Get events by category ID
 * Requirements: 2.1 - Display all events for a selected category
 * @param categoryId - Category ID to filter by
 * @returns Array of Events belonging to the category
 */
export function getEventsByCategory(categoryId: string): Event[] {
  // Validate category exists
  if (!eventCategoryRepository.categoryExists(categoryId)) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  return eventRepository.getEventsByCategory(categoryId);
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
