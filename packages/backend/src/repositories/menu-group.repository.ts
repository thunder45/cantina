import { MenuGroup } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default menu groups created on system initialization
 * Requirements: 2.1
 */
const DEFAULT_GROUPS: Omit<MenuGroup, 'id'>[] = [
  { name: 'Refeição', order: 1, isDefault: true },
  { name: 'Bebida', order: 2, isDefault: true },
  { name: 'Sobremesa', order: 3, isDefault: true },
];

/**
 * In-memory storage for menu groups (simulates DynamoDB)
 */
let menuGroups: Map<string, MenuGroup> = new Map();
let initialized = false;

/**
 * Initialize default groups if not already initialized
 * Requirements: 2.1
 */
export function initializeDefaultGroups(): MenuGroup[] {
  if (initialized) {
    return Array.from(menuGroups.values());
  }

  const createdGroups: MenuGroup[] = [];
  for (const group of DEFAULT_GROUPS) {
    const id = uuidv4();
    const menuGroup: MenuGroup = { id, ...group };
    menuGroups.set(id, menuGroup);
    createdGroups.push(menuGroup);
  }
  
  initialized = true;
  return createdGroups;
}

/**
 * Get all menu groups
 * Requirements: 2.2
 */
export function getGroups(): MenuGroup[] {
  if (!initialized) {
    initializeDefaultGroups();
  }
  return Array.from(menuGroups.values()).sort((a, b) => a.order - b.order);
}

/**
 * Get a menu group by ID
 */
export function getGroupById(id: string): MenuGroup | undefined {
  if (!initialized) {
    initializeDefaultGroups();
  }
  return menuGroups.get(id);
}

/**
 * Create a new menu group
 * Requirements: 2.2
 */
export function createGroup(name: string): MenuGroup {
  if (!initialized) {
    initializeDefaultGroups();
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('ERR_EMPTY_NAME');
  }

  // Check for duplicate name
  const existingGroup = Array.from(menuGroups.values()).find(
    g => g.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (existingGroup) {
    throw new Error('ERR_DUPLICATE_NAME');
  }

  const maxOrder = Math.max(0, ...Array.from(menuGroups.values()).map(g => g.order));
  
  const id = uuidv4();
  const menuGroup: MenuGroup = {
    id,
    name: trimmedName,
    order: maxOrder + 1,
    isDefault: false,
  };
  
  menuGroups.set(id, menuGroup);
  return menuGroup;
}

/**
 * Delete a menu group
 * Requirements: 2.3, 2.4
 * @param id - Group ID to delete
 * @param hasAssociatedItems - Function to check if group has items in current event
 * @throws Error if group has associated items
 */
export function deleteGroup(
  id: string, 
  hasAssociatedItems: (groupId: string) => boolean
): void {
  if (!initialized) {
    initializeDefaultGroups();
  }

  const group = menuGroups.get(id);
  if (!group) {
    throw new Error('ERR_GROUP_NOT_FOUND');
  }

  // Check if group has associated items (Requirements: 2.4)
  if (hasAssociatedItems(id)) {
    throw new Error('ERR_GROUP_HAS_ITEMS');
  }

  menuGroups.delete(id);
}

/**
 * Check if a group exists
 */
export function groupExists(id: string): boolean {
  if (!initialized) {
    initializeDefaultGroups();
  }
  return menuGroups.has(id);
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  menuGroups = new Map();
  initialized = false;
}

/**
 * Get initialization status (for testing)
 */
export function isInitialized(): boolean {
  return initialized;
}
