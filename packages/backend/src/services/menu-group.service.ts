import { MenuGroup } from '@cantina-pos/shared';
import * as menuGroupRepository from '../repositories/menu-group.repository';

/**
 * Menu Item checker function type
 * Used to check if a group has associated menu items in the current event
 */
export type HasMenuItemsChecker = (groupId: string) => boolean;

/**
 * Default checker that returns false (no items)
 * This will be replaced with actual implementation when MenuItem service is created
 */
let menuItemsChecker: HasMenuItemsChecker = () => false;

/**
 * Set the menu items checker function
 * This allows the MenuItem service to register its checker
 */
export function setMenuItemsChecker(checker: HasMenuItemsChecker): void {
  menuItemsChecker = checker;
}

/**
 * Get all menu groups sorted by order
 * Requirements: 2.2
 */
export function getGroups(): MenuGroup[] {
  return menuGroupRepository.getGroups();
}

/**
 * Get a menu group by ID
 */
export function getGroupById(id: string): MenuGroup | undefined {
  return menuGroupRepository.getGroupById(id);
}

/**
 * Create a new menu group
 * Requirements: 2.2
 * @param name - Name of the group
 * @returns Created MenuGroup
 * @throws Error if name is empty or duplicate
 */
export function createGroup(name: string): MenuGroup {
  return menuGroupRepository.createGroup(name);
}

/**
 * Delete a menu group
 * Requirements: 2.3, 2.4
 * @param id - Group ID to delete
 * @throws Error if group has associated items or doesn't exist
 */
export function deleteGroup(id: string): void {
  menuGroupRepository.deleteGroup(id, menuItemsChecker);
}

/**
 * Check if a group exists
 */
export function groupExists(id: string): boolean {
  return menuGroupRepository.groupExists(id);
}

/**
 * Initialize default groups
 * Requirements: 2.1
 */
export function initializeDefaultGroups(): MenuGroup[] {
  return menuGroupRepository.initializeDefaultGroups();
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  menuGroupRepository.resetRepository();
  menuItemsChecker = () => false;
}
