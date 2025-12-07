import { 
  EventCategory, 
  CreateEventCategoryInput, 
  UpdateEventCategoryInput,
  DEFAULT_CATEGORY_NAMES 
} from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for event categories (simulates DynamoDB)
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
let categories: Map<string, EventCategory> = new Map();
let initialized = false;

/**
 * Initialize default categories if not already done
 * Requirements: 1.1 - Creates Culto, Kids, Casais on first initialization
 */
export function initializeDefaultCategories(): void {
  if (initialized) {
    return;
  }

  const now = new Date().toISOString();
  
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const id = uuidv4();
    const category: EventCategory = {
      id,
      name,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    categories.set(id, category);
  }
  
  initialized = true;
}

/**
 * Create a new event category
 * Requirements: 1.3
 * @param input - Category data with name
 * @returns Created EventCategory
 * @throws Error if validation fails
 */
export function createCategory(input: CreateEventCategoryInput): EventCategory {
  const trimmedName = input.name.trim();
  
  // Validate name is not empty (Requirements: 16.2)
  if (!trimmedName) {
    throw new Error('ERR_EMPTY_NAME');
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  
  const category: EventCategory = {
    id,
    name: trimmedName,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  
  categories.set(id, category);
  return category;
}


/**
 * Get a category by ID
 * @param id - Category ID
 * @returns EventCategory or undefined
 */
export function getCategoryById(id: string): EventCategory | undefined {
  return categories.get(id);
}

/**
 * Get all categories
 * Requirements: 1.2
 * @returns Array of EventCategories sorted by name
 */
export function getCategories(): EventCategory[] {
  return Array.from(categories.values())
    .sort((a, b) => a.name.localeCompare(b.name));
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
  const category = categories.get(id);
  
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  const trimmedName = input.name.trim();
  
  // Validate name is not empty (Requirements: 16.2)
  if (!trimmedName) {
    throw new Error('ERR_EMPTY_NAME');
  }
  
  const updatedCategory: EventCategory = {
    ...category,
    name: trimmedName,
    updatedAt: new Date().toISOString(),
    version: category.version + 1,
  };
  
  categories.set(id, updatedCategory);
  return updatedCategory;
}

/**
 * Delete a category
 * Requirements: 1.5, 1.6 - Only delete if no events associated
 * @param id - Category ID
 * @throws Error if category not found
 */
export function deleteCategory(id: string): void {
  const category = categories.get(id);
  
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  categories.delete(id);
}

/**
 * Check if a category exists
 * @param id - Category ID
 * @returns true if category exists
 */
export function categoryExists(id: string): boolean {
  return categories.has(id);
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  categories = new Map();
  initialized = false;
}

/**
 * Get count of categories (for testing purposes)
 */
export function getCategoryCount(): number {
  return categories.size;
}

/**
 * Check if default categories have been initialized
 */
export function isInitialized(): boolean {
  return initialized;
}
