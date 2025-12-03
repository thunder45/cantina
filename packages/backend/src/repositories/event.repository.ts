import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for events (simulates DynamoDB)
 */
let events: Map<string, Event> = new Map();

/**
 * Create a new event
 * Requirements: 1.1, 1.2, 1.3
 * @param input - Event data with name, dates, and categories
 * @returns Created Event
 * @throws Error if validation fails
 */
export function createEvent(input: CreateEventInput): Event {
  const trimmedName = input.name.trim();
  
  // Validate name is not empty (Requirements: 15.2)
  if (!trimmedName) {
    throw new Error('ERR_EMPTY_NAME');
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
    name: trimmedName,
    dates: [...input.dates], // Support multiple non-sequential dates (Req 1.2)
    categories: [...(input.categories || [])], // Store categories for reports (Req 1.3)
    status: 'active',
    createdAt: now,
    updatedAt: now,
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
 * Requirements: 1.4
 * @returns Array of Events sorted by creation date (newest first)
 */
export function getEvents(): Event[] {
  return Array.from(events.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
