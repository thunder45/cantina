import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '@cantina-pos/shared';
import * as catalogItemRepository from '../repositories/catalog-item.repository';
import * as menuGroupService from './menu-group.service';

/**
 * Create a new catalog item
 * Requirements: 3.1, 4.4
 * @param input - Catalog item data
 * @returns Created CatalogItem
 * @throws Error if validation fails or group doesn't exist
 */
export function createCatalogItem(input: CreateCatalogItemInput): CatalogItem {
  // Validate group exists
  if (!menuGroupService.groupExists(input.groupId)) {
    throw new Error('ERR_GROUP_NOT_FOUND');
  }
  
  return catalogItemRepository.createCatalogItem(input);
}

/**
 * Get a catalog item by ID
 * @param id - Catalog item ID
 * @param includeDeleted - Whether to include soft-deleted items
 * @returns CatalogItem or undefined
 */
export function getCatalogItemById(id: string, includeDeleted = false): CatalogItem | undefined {
  return catalogItemRepository.getCatalogItemById(id, includeDeleted);
}

/**
 * Get all catalog items
 * Requirements: 3.4
 * @param groupId - Optional filter by group
 * @param includeDeleted - Whether to include soft-deleted items
 * @returns Array of CatalogItems sorted by group and description
 */
export function getCatalogItems(groupId?: string, includeDeleted = false): CatalogItem[] {
  return catalogItemRepository.getCatalogItems(groupId, includeDeleted);
}

/**
 * Search catalog items by description or group name
 * Requirements: 3.3
 * Never includes soft-deleted items
 * @param query - Search query string
 * @returns Array of matching CatalogItems
 */
export function searchCatalogItems(query: string): CatalogItem[] {
  return catalogItemRepository.searchCatalogItems(query, (groupId) => {
    const group = menuGroupService.getGroupById(groupId);
    return group?.name;
  });
}


/**
 * Update a catalog item
 * Requirements: 3.2
 * Note: Edits don't affect existing menus (menus store snapshots)
 * @param id - Catalog item ID
 * @param updates - Fields to update
 * @returns Updated CatalogItem
 * @throws Error if item not found, validation fails, or group doesn't exist
 */
export function updateCatalogItem(id: string, updates: UpdateCatalogItemInput): CatalogItem {
  // Validate group exists if being updated
  if (updates.groupId !== undefined && !menuGroupService.groupExists(updates.groupId)) {
    throw new Error('ERR_GROUP_NOT_FOUND');
  }
  
  return catalogItemRepository.updateCatalogItem(id, updates);
}

/**
 * Soft delete a catalog item
 * Requirements: 3.5
 * Maintains historical references but marks as inactive
 * @param id - Catalog item ID
 * @throws Error if item not found
 */
export function deleteCatalogItem(id: string): void {
  catalogItemRepository.deleteCatalogItem(id);
}

/**
 * Check if a catalog item exists (not soft-deleted)
 * @param id - Catalog item ID
 * @returns true if item exists and is not deleted
 */
export function catalogItemExists(id: string): boolean {
  return catalogItemRepository.catalogItemExists(id);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  catalogItemRepository.resetRepository();
}
