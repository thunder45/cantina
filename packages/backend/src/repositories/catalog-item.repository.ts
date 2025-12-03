import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for catalog items (simulates DynamoDB)
 */
let catalogItems: Map<string, CatalogItem> = new Map();

/**
 * Create a new catalog item
 * Requirements: 3.1, 4.4
 * @param input - Catalog item data
 * @returns Created CatalogItem
 * @throws Error if validation fails
 */
export function createCatalogItem(input: CreateCatalogItemInput): CatalogItem {
  const trimmedDescription = input.description.trim();
  
  // Validate description is not empty (Requirements: 15.2)
  if (!trimmedDescription) {
    throw new Error('ERR_EMPTY_NAME');
  }

  // Validate price is positive (Requirements: 15.1)
  if (input.suggestedPrice <= 0) {
    throw new Error('ERR_INVALID_PRICE');
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  
  const catalogItem: CatalogItem = {
    id,
    description: trimmedDescription,
    suggestedPrice: input.suggestedPrice,
    groupId: input.groupId,
    createdAt: now,
    updatedAt: now,
  };
  
  catalogItems.set(id, catalogItem);
  return catalogItem;
}

/**
 * Get a catalog item by ID
 * @param id - Catalog item ID
 * @param includeDeleted - Whether to include soft-deleted items
 * @returns CatalogItem or undefined
 */
export function getCatalogItemById(id: string, includeDeleted = false): CatalogItem | undefined {
  const item = catalogItems.get(id);
  if (!item) return undefined;
  
  // Exclude soft-deleted items unless explicitly requested
  if (!includeDeleted && item.deletedAt) {
    return undefined;
  }
  
  return item;
}


/**
 * Get all catalog items
 * Requirements: 3.4
 * @param groupId - Optional filter by group
 * @param includeDeleted - Whether to include soft-deleted items
 * @returns Array of CatalogItems sorted by group and description
 */
export function getCatalogItems(groupId?: string, includeDeleted = false): CatalogItem[] {
  let items = Array.from(catalogItems.values());
  
  // Filter out soft-deleted items unless explicitly requested
  if (!includeDeleted) {
    items = items.filter(item => !item.deletedAt);
  }
  
  // Filter by group if specified
  if (groupId) {
    items = items.filter(item => item.groupId === groupId);
  }
  
  // Sort by group and description (Requirements: 3.4)
  return items.sort((a, b) => {
    const groupCompare = a.groupId.localeCompare(b.groupId);
    if (groupCompare !== 0) return groupCompare;
    return a.description.localeCompare(b.description);
  });
}

/**
 * Search catalog items by description or group name
 * Requirements: 3.3
 * Never includes soft-deleted items
 * @param query - Search query string
 * @param getGroupName - Function to get group name by ID
 * @returns Array of matching CatalogItems
 */
export function searchCatalogItems(
  query: string,
  getGroupName: (groupId: string) => string | undefined
): CatalogItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return [];
  }
  
  return Array.from(catalogItems.values())
    .filter(item => {
      // Never include soft-deleted items in search
      if (item.deletedAt) return false;
      
      // Check if description contains query
      if (item.description.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check if group name contains query
      const groupName = getGroupName(item.groupId);
      if (groupName && groupName.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      return false;
    })
    .sort((a, b) => {
      const groupCompare = a.groupId.localeCompare(b.groupId);
      if (groupCompare !== 0) return groupCompare;
      return a.description.localeCompare(b.description);
    });
}

/**
 * Update a catalog item
 * Requirements: 3.2
 * Note: Edits don't affect existing menus (menus store snapshots)
 * @param id - Catalog item ID
 * @param updates - Fields to update
 * @returns Updated CatalogItem
 * @throws Error if item not found or validation fails
 */
export function updateCatalogItem(id: string, updates: UpdateCatalogItemInput): CatalogItem {
  const item = catalogItems.get(id);
  
  if (!item) {
    throw new Error('ERR_ITEM_NOT_FOUND');
  }
  
  // Don't allow updating soft-deleted items
  if (item.deletedAt) {
    throw new Error('ERR_ITEM_NOT_FOUND');
  }
  
  // Validate description if provided
  if (updates.description !== undefined) {
    const trimmedDescription = updates.description.trim();
    if (!trimmedDescription) {
      throw new Error('ERR_EMPTY_NAME');
    }
    updates.description = trimmedDescription;
  }
  
  // Validate price if provided (Requirements: 15.1)
  if (updates.suggestedPrice !== undefined && updates.suggestedPrice <= 0) {
    throw new Error('ERR_INVALID_PRICE');
  }
  
  const updatedItem: CatalogItem = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  catalogItems.set(id, updatedItem);
  return updatedItem;
}

/**
 * Soft delete a catalog item
 * Requirements: 3.5
 * Maintains historical references but marks as inactive
 * @param id - Catalog item ID
 * @throws Error if item not found
 */
export function deleteCatalogItem(id: string): void {
  const item = catalogItems.get(id);
  
  if (!item) {
    throw new Error('ERR_ITEM_NOT_FOUND');
  }
  
  // Already deleted
  if (item.deletedAt) {
    throw new Error('ERR_ITEM_NOT_FOUND');
  }
  
  // Soft delete - set deletedAt timestamp
  const deletedItem: CatalogItem = {
    ...item,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  catalogItems.set(id, deletedItem);
}

/**
 * Check if a catalog item exists (not soft-deleted)
 * @param id - Catalog item ID
 * @returns true if item exists and is not deleted
 */
export function catalogItemExists(id: string): boolean {
  const item = catalogItems.get(id);
  return item !== undefined && !item.deletedAt;
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  catalogItems = new Map();
}

/**
 * Get count of items (for testing purposes)
 * @param includeDeleted - Whether to include soft-deleted items
 */
export function getItemCount(includeDeleted = false): number {
  if (includeDeleted) {
    return catalogItems.size;
  }
  return Array.from(catalogItems.values()).filter(item => !item.deletedAt).length;
}
