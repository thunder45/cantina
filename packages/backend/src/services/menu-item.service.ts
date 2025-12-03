import { MenuItem, AddMenuItemInput, UpdateMenuItemInput } from '@cantina-pos/shared';
import * as menuItemRepository from '../repositories/menu-item.repository';
import * as eventRepository from '../repositories/event.repository';
import * as menuGroupRepository from '../repositories/menu-group.repository';
import * as catalogItemRepository from '../repositories/catalog-item.repository';

/**
 * Add a menu item to an event
 * Requirements: 4.1, 4.2, 4.4
 * @param eventId - Event ID
 * @param input - Menu item data
 * @returns Created MenuItem
 * @throws Error if validation fails, event not found, or group not found
 */
export function addMenuItem(eventId: string, input: AddMenuItemInput): MenuItem {
  // Validate event exists
  if (!eventRepository.eventExists(eventId)) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  // Validate group exists
  if (!menuGroupRepository.groupExists(input.groupId)) {
    throw new Error('ERR_GROUP_NOT_FOUND');
  }
  
  // Validate catalog item exists (if provided)
  if (input.catalogItemId && !catalogItemRepository.catalogItemExists(input.catalogItemId)) {
    throw new Error('ERR_CATALOG_ITEM_NOT_FOUND');
  }
  
  return menuItemRepository.addMenuItem(eventId, input);
}

/**
 * Get a menu item by ID
 * @param id - Menu item ID
 * @returns MenuItem or undefined
 */
export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItemRepository.getMenuItemById(id);
}

/**
 * Get a menu item by ID (throws if not found)
 * @param id - Menu item ID
 * @returns MenuItem
 * @throws Error if item not found
 */
export function getMenuItem(id: string): MenuItem {
  const item = menuItemRepository.getMenuItemById(id);
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  return item;
}


/**
 * Get all menu items for an event
 * Requirements: 4.5
 * @param eventId - Event ID
 * @returns Array of MenuItems sorted by group and description
 * @throws Error if event not found
 */
export function getMenuItemsByEvent(eventId: string): MenuItem[] {
  // Validate event exists
  if (!eventRepository.eventExists(eventId)) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  return menuItemRepository.getMenuItemsByEvent(eventId);
}

/**
 * Update a menu item
 * Requirements: 4.2
 * @param id - Menu item ID
 * @param updates - Fields to update (price, stock)
 * @returns Updated MenuItem
 * @throws Error if item not found or validation fails
 */
export function updateMenuItem(id: string, updates: UpdateMenuItemInput): MenuItem {
  return menuItemRepository.updateMenuItem(id, updates);
}

/**
 * Remove a menu item from an event
 * Requirements: 3.6
 * @param id - Menu item ID
 * @throws Error if item not found
 */
export function removeMenuItem(id: string): void {
  menuItemRepository.removeMenuItem(id);
}

/**
 * Check if a menu item exists
 * @param id - Menu item ID
 * @returns true if item exists
 */
export function menuItemExists(id: string): boolean {
  return menuItemRepository.menuItemExists(id);
}

/**
 * Get available stock for a menu item
 * Requirements: 4.3, 6.3
 * @param id - Menu item ID
 * @returns Available stock (Infinity if stock is 0/infinite)
 * @throws Error if item not found
 */
export function getAvailableStock(id: string): number {
  return menuItemRepository.getAvailableStock(id);
}

/**
 * Check if a menu item is available for sale
 * Requirements: 6.2
 * @param id - Menu item ID
 * @returns true if item is available
 */
export function isMenuItemAvailable(id: string): boolean {
  return menuItemRepository.isMenuItemAvailable(id);
}

/**
 * Increment sold count for a menu item (when sale is confirmed)
 * Requirements: 6.1
 * @param id - Menu item ID
 * @param quantity - Quantity sold
 * @returns Updated MenuItem
 * @throws Error if item not found or insufficient stock
 */
export function incrementSoldCount(id: string, quantity: number): MenuItem {
  return menuItemRepository.incrementSoldCount(id, quantity);
}

/**
 * Decrement sold count for a menu item (for refunds/cancellations)
 * Requirements: 14.1
 * @param id - Menu item ID
 * @param quantity - Quantity to restore
 * @returns Updated MenuItem
 * @throws Error if item not found
 */
export function decrementSoldCount(id: string, quantity: number): MenuItem {
  return menuItemRepository.decrementSoldCount(id, quantity);
}

/**
 * Check if a group has menu items in a specific event
 * Requirements: 2.4
 * @param groupId - Group ID
 * @param eventId - Event ID
 * @returns true if group has items in the event
 */
export function groupHasMenuItems(groupId: string, eventId: string): boolean {
  return menuItemRepository.groupHasMenuItems(groupId, eventId);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  menuItemRepository.resetRepository();
}
