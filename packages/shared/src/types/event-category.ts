/**
 * EventCategory - Classificação obrigatória que agrupa eventos por tipo
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export interface EventCategory {
  id: string;
  name: string;
  isDefault: boolean;  // true for Culto, Kids, Casais
  createdAt: string;
  updatedAt: string;
  version: number; // For optimistic locking
}

export interface CreateEventCategoryInput {
  name: string;
}

export interface UpdateEventCategoryInput {
  name: string;
}

/**
 * Default category names that are created on system initialization
 * Requirements: 1.1
 */
export const DEFAULT_CATEGORY_NAMES = ['Culto', 'Kids', 'Casais'] as const;
