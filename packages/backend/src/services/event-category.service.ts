import { EventCategory, CreateEventCategoryInput, UpdateEventCategoryInput } from '@cantina-pos/shared';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as eventRepository from '../repositories/event.repository';

export function initializeDefaultCategories(): void {
  eventCategoryRepository.initializeDefaultCategories();
}

export async function getCategories(): Promise<(EventCategory & { eventCount: number })[]> {
  const categories = await eventCategoryRepository.getCategories();
  const result: (EventCategory & { eventCount: number })[] = [];
  for (const category of categories) {
    const eventCount = await eventRepository.countEventsByCategory(category.id);
    result.push({ ...category, eventCount });
  }
  return result;
}

export async function getCategory(id: string): Promise<EventCategory> {
  const category = await eventCategoryRepository.getCategoryById(id);
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  return category;
}

export async function createCategory(input: CreateEventCategoryInput): Promise<EventCategory> {
  return eventCategoryRepository.createCategory(input);
}

export async function updateCategory(id: string, input: UpdateEventCategoryInput): Promise<EventCategory> {
  return eventCategoryRepository.updateCategory(id, input);
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await eventCategoryRepository.getCategoryById(id);
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');

  const eventCount = await eventRepository.countEventsByCategory(id);
  if (eventCount > 0) throw new Error('ERR_CATEGORY_HAS_EVENTS');

  await eventCategoryRepository.deleteCategory(id);
}

export async function categoryExists(id: string): Promise<boolean> {
  return eventCategoryRepository.categoryExists(id);
}

export function resetRepository(): void {
  eventCategoryRepository.resetRepository();
}
