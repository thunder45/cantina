import { MenuGroup } from '@cantina-pos/shared';
import * as menuGroupRepository from '../repositories/menu-group.repository';

export type HasMenuItemsChecker = (groupId: string) => boolean;
let menuItemsChecker: HasMenuItemsChecker = () => false;

export function setMenuItemsChecker(checker: HasMenuItemsChecker): void {
  menuItemsChecker = checker;
}

export async function getGroups(): Promise<MenuGroup[]> {
  return menuGroupRepository.getGroups();
}

export async function getGroupById(id: string): Promise<MenuGroup | undefined> {
  return menuGroupRepository.getGroupById(id);
}

// Sync version for local dev
export function getGroupByIdSync(id: string): MenuGroup | undefined {
  return menuGroupRepository.getGroupByIdSync(id);
}

export async function createGroup(name: string): Promise<MenuGroup> {
  return menuGroupRepository.createGroup(name);
}

export async function deleteGroup(id: string): Promise<void> {
  return menuGroupRepository.deleteGroup(id, menuItemsChecker);
}

export async function groupExists(id: string): Promise<boolean> {
  return menuGroupRepository.groupExists(id);
}

export function initializeDefaultGroups(): MenuGroup[] {
  return menuGroupRepository.initializeDefaultGroups();
}

export function resetService(): void {
  menuGroupRepository.resetRepository();
  menuItemsChecker = () => false;
}
