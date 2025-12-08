import { MenuItem, AddMenuItemInput, UpdateMenuItemInput } from '@cantina-pos/shared';
import * as menuItemRepository from '../repositories/menu-item.repository';
import * as eventRepository from '../repositories/event.repository';
import * as menuGroupRepository from '../repositories/menu-group.repository';
import * as catalogItemRepository from '../repositories/catalog-item.repository';
import * as auditLogService from './audit-log.service';

export async function addMenuItem(eventId: string, input: AddMenuItemInput): Promise<MenuItem> {
  if (!await eventRepository.eventExists(eventId)) throw new Error('ERR_EVENT_NOT_FOUND');
  if (!await menuGroupRepository.groupExists(input.groupId)) throw new Error('ERR_GROUP_NOT_FOUND');
  if (input.catalogItemId && !await catalogItemRepository.catalogItemExists(input.catalogItemId)) {
    throw new Error('ERR_CATALOG_ITEM_NOT_FOUND');
  }
  if (input.catalogItemId) {
    await catalogItemRepository.updateCatalogItem(input.catalogItemId, { suggestedPrice: input.price });
  }
  return menuItemRepository.addMenuItem(eventId, input);
}

export async function getMenuItemById(id: string): Promise<MenuItem | undefined> {
  return menuItemRepository.getMenuItemById(id);
}

export async function getMenuItem(id: string): Promise<MenuItem> {
  const item = await menuItemRepository.getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  return item;
}

export async function getMenuItemsByEvent(eventId: string): Promise<MenuItem[]> {
  if (!await eventRepository.eventExists(eventId)) throw new Error('ERR_EVENT_NOT_FOUND');
  return menuItemRepository.getMenuItemsByEvent(eventId);
}

export async function updateMenuItem(id: string, updates: UpdateMenuItemInput, userId = 'system'): Promise<MenuItem> {
  const currentItem = await menuItemRepository.getMenuItemById(id);
  const updatedItem = await menuItemRepository.updateMenuItem(id, updates);
  if (updates.price !== undefined && currentItem && currentItem.price !== updates.price) {
    await auditLogService.logPriceChange(id, userId, currentItem.price, updates.price);
  }
  return updatedItem;
}

export async function removeMenuItem(id: string): Promise<void> {
  return menuItemRepository.removeMenuItem(id);
}

export async function menuItemExists(id: string): Promise<boolean> {
  return menuItemRepository.menuItemExists(id);
}

export async function getAvailableStock(id: string): Promise<number> {
  return menuItemRepository.getAvailableStock(id);
}

export async function isMenuItemAvailable(id: string): Promise<boolean> {
  return menuItemRepository.isMenuItemAvailable(id);
}

export async function incrementSoldCount(id: string, quantity: number): Promise<MenuItem> {
  return menuItemRepository.incrementSoldCount(id, quantity);
}

export async function decrementSoldCount(id: string, quantity: number): Promise<MenuItem> {
  return menuItemRepository.decrementSoldCount(id, quantity);
}

export async function groupHasMenuItems(groupId: string, eventId: string): Promise<boolean> {
  return menuItemRepository.groupHasMenuItems(groupId, eventId);
}

export function resetService(): void {
  menuItemRepository.resetRepository();
}
