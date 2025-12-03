import { MenuItem, AddMenuItemInput, UpdateMenuItemInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for menu items (simulates DynamoDB)
 * Key: menuItemId, Value: MenuItem
 */
let menuItems: Map<string, MenuItem> = new Map();

/**
 * Add a menu item to an event
 * Requirements: 4.1, 4.2
 * @param eventId - Event ID
 * @param input - Menu item data
 * @returns Created MenuItem
 * @throws Error if validation fails
 */
export function addMenuItem(eventId: string, input: AddMenuItemInput): MenuItem {
  // Validate price is positive (Requirements: 15.1)
  if (input.price <= 0) {
    throw new Error('ERR_INVALID_PRICE');
  }

  // Validate stock is non-negative
  if (input.stock < 0) {
    throw new Error('ERR_INVALID_STOCK');
  }

  // Validate description is not empty
  const trimmedDescription = input.description.trim();
  if (!trimmedDescription) {
    throw new Error('ERR_EMPTY_NAME');
  }

  const id = uuidv4();
  
  const menuItem: MenuItem = {
    id,
    eventId,
    catalogItemId: input.catalogItemId,
    description: trimmedDescription,
    price: input.price,
    stock: input.stock, // 0 = infinite (Requirements: 4.3)
    soldCount: 0,
    groupId: input.groupId,
  };
  
  menuItems.set(id, menuItem);
  return menuItem;
}


/**
 * Get a menu item by ID
 * @param id - Menu item ID
 * @returns MenuItem or undefined
 */
export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItems.get(id);
}

/**
 * Get all menu items for an event
 * Requirements: 4.5
 * @param eventId - Event ID
 * @returns Array of MenuItems sorted by group and description
 */
export function getMenuItemsByEvent(eventId: string): MenuItem[] {
  return Array.from(menuItems.values())
    .filter(item => item.eventId === eventId)
    .sort((a, b) => {
      const groupCompare = a.groupId.localeCompare(b.groupId);
      if (groupCompare !== 0) return groupCompare;
      return a.description.localeCompare(b.description);
    });
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
  const item = menuItems.get(id);
  
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  
  // Validate price if provided (Requirements: 15.1)
  if (updates.price !== undefined && updates.price <= 0) {
    throw new Error('ERR_INVALID_PRICE');
  }
  
  // Validate stock if provided
  if (updates.stock !== undefined && updates.stock < 0) {
    throw new Error('ERR_INVALID_STOCK');
  }
  
  const updatedItem: MenuItem = {
    ...item,
    ...updates,
  };
  
  menuItems.set(id, updatedItem);
  return updatedItem;
}

/**
 * Remove a menu item from an event
 * Requirements: 3.6
 * @param id - Menu item ID
 * @throws Error if item not found
 */
export function removeMenuItem(id: string): void {
  const item = menuItems.get(id);
  
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  
  menuItems.delete(id);
}

/**
 * Check if a menu item exists
 * @param id - Menu item ID
 * @returns true if item exists
 */
export function menuItemExists(id: string): boolean {
  return menuItems.has(id);
}

/**
 * Get available stock for a menu item
 * Requirements: 4.3, 6.3
 * @param id - Menu item ID
 * @returns Available stock (Infinity if stock is 0/infinite)
 * @throws Error if item not found
 */
export function getAvailableStock(id: string): number {
  const item = menuItems.get(id);
  
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  
  // Stock 0 means infinite (Requirements: 4.3)
  if (item.stock === 0) {
    return Infinity;
  }
  
  return item.stock - item.soldCount;
}

/**
 * Check if a menu item is available for sale
 * Requirements: 6.2
 * @param id - Menu item ID
 * @returns true if item is available
 */
export function isMenuItemAvailable(id: string): boolean {
  const item = menuItems.get(id);
  
  if (!item) {
    return false;
  }
  
  // Infinite stock (stock = 0) is always available
  if (item.stock === 0) {
    return true;
  }
  
  // Available if soldCount < stock
  return item.soldCount < item.stock;
}

/**
 * Increment sold count for a menu item
 * Requirements: 6.1
 * @param id - Menu item ID
 * @param quantity - Quantity sold
 * @returns Updated MenuItem
 * @throws Error if item not found or insufficient stock
 */
export function incrementSoldCount(id: string, quantity: number): MenuItem {
  const item = menuItems.get(id);
  
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  
  if (quantity <= 0) {
    throw new Error('ERR_INVALID_QUANTITY');
  }
  
  // Check stock availability (skip for infinite stock)
  if (item.stock > 0) {
    const available = item.stock - item.soldCount;
    if (quantity > available) {
      throw new Error('ERR_STOCK_INSUFFICIENT');
    }
  }
  
  const updatedItem: MenuItem = {
    ...item,
    soldCount: item.soldCount + quantity,
  };
  
  menuItems.set(id, updatedItem);
  return updatedItem;
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
  const item = menuItems.get(id);
  
  if (!item) {
    throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  }
  
  if (quantity <= 0) {
    throw new Error('ERR_INVALID_QUANTITY');
  }
  
  // Ensure soldCount doesn't go negative
  const newSoldCount = Math.max(0, item.soldCount - quantity);
  
  const updatedItem: MenuItem = {
    ...item,
    soldCount: newSoldCount,
  };
  
  menuItems.set(id, updatedItem);
  return updatedItem;
}

/**
 * Check if a group has menu items in a specific event
 * Requirements: 2.4
 * @param groupId - Group ID
 * @param eventId - Event ID
 * @returns true if group has items in the event
 */
export function groupHasMenuItems(groupId: string, eventId: string): boolean {
  return Array.from(menuItems.values())
    .some(item => item.groupId === groupId && item.eventId === eventId);
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  menuItems = new Map();
}

/**
 * Get count of menu items (for testing purposes)
 * @param eventId - Optional filter by event
 */
export function getMenuItemCount(eventId?: string): number {
  if (eventId) {
    return Array.from(menuItems.values()).filter(item => item.eventId === eventId).length;
  }
  return menuItems.size;
}
