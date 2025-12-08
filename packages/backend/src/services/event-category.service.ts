import { EventCategory, CreateEventCategoryInput, UpdateEventCategoryInput } from '@cantina-pos/shared';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as eventRepository from '../repositories/event.repository';

/**
 * Initialize default categories if not already done
 */
export function initializeDefaultCategories(): void {
  eventCategoryRepository.initializeDefaultCategories();
}

/**
 * Get all categories with event counts
 */
export async function getCategories(): Promise<(EventCategory & { eventCount: number })[]> {
  const categories = await eventCategoryRepository.getCategories();
  return categories.map(category => ({
    ...category,
    eventCount: eventRepository.countEventsByCategory(category.id),
  }));
}

/**
 * Get a category by ID
 */
export async function getCategory(id: string): Promise<EventCategory> {
  const category = await eventCategoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  return category;
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateEventCategoryInput): Promise<EventCategory> {
  return eventCategoryRepository.createCategory(input);
}

/**
 * Update a category
 */
export async function updateCategory(id: string, input: UpdateEventCategoryInput): Promise<EventCategory> {
  return eventCategoryRepository.updateCategory(id, input);
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const category = await eventCategoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  const eventCount = eventRepository.countEventsByCategory(id);
  if (eventCount > 0) {
    throw new Error('ERR_CATEGORY_HAS_EVENTS');
  }
  
  await eventCategoryRepository.deleteCategory(id);
}

/**
 * Check if a category exists
 */
export async function categoryExists(id: string): Promise<boolean> {
  return eventCategoryRepository.categoryExists(id);
}

/**
 * Reset repository (for testing)
 */
export function resetRepository(): void {
  eventCategoryRepository.resetRepository();
}
