import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for events (simulates DynamoDB)
 */
let events: Map<string, Event> = new Map();

/**
 * Create a new event
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * @param input - Event data with categoryId, name, and dates
 * @returns Created Event
 * @throws Error if validation fails
 */
export function createEvent(input: CreateEventInput): Event {
  const trimmedName = input.name.trim();
  
  // Validate name is not empty (Requirements: 16.2)
  if (!trimmedName) {
    throw new Error('ERR_EMPTY_NAME');
  }

  // Validate categoryId is provided (Requirements: 2.2)
  if (!input.categoryId || !input.categoryId.trim()) {
    throw new Error('ERR_CATEGORY_REQUIRED');
  }

  // Validate dates array is not empty
  if (!input.dates || input.dates.length === 0) {
    throw new Error('ERR_INVALID_DATES');
  }

  // Validate each date is a valid ISO date string
  for (const date of input.dates) {
    if (!isValidISODate(date)) {
      throw new Error('ERR_INVALID_DATE_FORMAT');
    }
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  
  const event: Event = {
    id,
    categoryId: input.categoryId.trim(), // Required category reference (Req 2.2)
    name: trimmedName,
    dates: [...input.dates], // Support multiple non-sequential dates (Req 2.3)
    categories: [...(input.categories || [])], // Legacy field for backward compatibility
    status: 'active',
    createdAt: now,
    updatedAt: now,
    version: 1, // Initialize version for optimistic locking
  };
  
  events.set(id, event);
  return event;
}

/**
 * Get an event by ID
 * @param id - Event ID
 * @returns Event or undefined
 */
export function getEventById(id: string): Event | undefined {
  return events.get(id);
}

/**
 * Get all events
 * Requirements: 2.5
 * @returns Array of Events sorted by creation date (newest first)
 */
export function getEvents(): Event[] {
  return Array.from(events.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get events by category ID
 * Requirements: 2.1 - Display all events for a selected category
 * @param categoryId - Category ID to filter by
 * @returns Array of Events belonging to the category, sorted by creation date (newest first)
 */
export function getEventsByCategory(categoryId: string): Event[] {
  return Array.from(events.values())
    .filter(event => event.categoryId === categoryId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Count events by category ID
 * Requirements: 1.2 - Display event count per category
 * @param categoryId - Category ID to count events for
 * @returns Number of events in the category
 */
export function countEventsByCategory(categoryId: string): number {
  return Array.from(events.values())
    .filter(event => event.categoryId === categoryId)
    .length;
}

/**
 * Update event status
 * Requirements: 1.4
 * @param id - Event ID
 * @param input - Status update input
 * @returns Updated Event
 * @throws Error if event not found
 */
export function updateEventStatus(id: string, input: UpdateEventStatusInput): Event {
  const event = events.get(id);
  
  if (!event) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  const updatedEvent: Event = {
    ...event,
    status: input.status,
    updatedAt: new Date().toISOString(),
    version: event.version + 1, // Increment version for optimistic locking
  };
  
  events.set(id, updatedEvent);
  return updatedEvent;
}

/**
 * Check if an event exists
 * @param id - Event ID
 * @returns true if event exists
 */
export function eventExists(id: string): boolean {
  return events.has(id);
}

/**
 * Validate ISO date string format
 * @param dateStr - Date string to validate
 * @returns true if valid ISO date
 */
function isValidISODate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  events = new Map();
}

/**
 * Get count of events (for testing purposes)
 */
export function getEventCount(): number {
  return events.size;
}
