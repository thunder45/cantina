import { 
  EventCategory, 
  CreateEventCategoryInput, 
  UpdateEventCategoryInput,
  DEFAULT_CATEGORY_NAMES 
} from '@cantina-pos/shared';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as eventRepository from '../repositories/event.repository';

/**
 * Initialize default categories if not already done
 * Requirements: 1.1 - Creates Culto, Kids, Casais on first initialization
 */
export function initializeDefaultCategories(): void {
  eventCategoryRepository.initializeDefaultCategories();
}

/**
 * Get all categories with event counts
 * Requirements: 1.2 - Display all categories with event count
 * @returns Array of EventCategories with computed eventCount
 */
export function getCategories(): (EventCategory & { eventCount: number })[] {
  const categories = eventCategoryRepository.getCategories();
  return categories.map(category => ({
    ...category,
    eventCount: eventRepository.countEventsByCategory(category.id),
  }));
}

/**
 * Get a category by ID
 * @param id - Category ID
 * @returns EventCategory
 * @throws Error if category not found
 */
export function getCategory(id: string): EventCategory {
  const category = eventCategoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  return category;
}

/**
 * Get a category by ID with event count
 * @param id - Category ID
 * @returns EventCategory with eventCount
 * @throws Error if category not found
 */
export function getCategoryWithEventCount(id: string): EventCategory & { eventCount: number } {
  const category = getCategory(id);
  return {
    ...category,
    eventCount: eventRepository.countEventsByCategory(category.id),
  };
}


/**
 * Create a new category
 * Requirements: 1.3 - Create category with name
 * @param input - Category data with name
 * @returns Created EventCategory
 * @throws Error if validation fails
 */
export function createCategory(input: CreateEventCategoryInput): EventCategory {
  return eventCategoryRepository.createCategory(input);
}

/**
 * Update a category
 * Requirements: 1.4 - Update name without affecting existing events
 * @param id - Category ID
 * @param input - Update data
 * @returns Updated EventCategory
 * @throws Error if category not found or validation fails
 */
export function updateCategory(id: string, input: UpdateEventCategoryInput): EventCategory {
  return eventCategoryRepository.updateCategory(id, input);
}

/**
 * Delete a category
 * Requirements: 1.5, 1.6 - Only delete if no events associated
 * @param id - Category ID
 * @throws Error if category not found or has associated events
 */
export function deleteCategory(id: string): void {
  // Check if category exists
  const category = eventCategoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  // Check if category has associated events (Requirements: 1.5)
  const eventCount = eventRepository.countEventsByCategory(id);
  if (eventCount > 0) {
    throw new Error('ERR_CATEGORY_HAS_EVENTS');
  }
  
  // Delete the category (Requirements: 1.6)
  eventCategoryRepository.deleteCategory(id);
}

/**
 * Get event count for a category
 * Requirements: 1.2 - Display event count per category
 * @param id - Category ID
 * @returns Number of events in the category
 */
export function getCategoryEventCount(id: string): number {
  // Verify category exists
  const category = eventCategoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  return eventRepository.countEventsByCategory(id);
}

/**
 * Check if a category exists
 * @param id - Category ID
 * @returns true if category exists
 */
export function categoryExists(id: string): boolean {
  return eventCategoryRepository.categoryExists(id);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  eventCategoryRepository.resetRepository();
}
