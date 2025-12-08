import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '@cantina-pos/shared';
import * as catalogItemRepository from '../repositories/catalog-item.repository';
import * as menuGroupService from './menu-group.service';
import * as auditLogService from './audit-log.service';

export async function createCatalogItem(input: CreateCatalogItemInput): Promise<CatalogItem> {
  if (!await menuGroupService.groupExists(input.groupId)) throw new Error('ERR_GROUP_NOT_FOUND');
  return catalogItemRepository.createCatalogItem(input);
}

export async function getCatalogItemById(id: string, includeDeleted = false): Promise<CatalogItem | undefined> {
  return catalogItemRepository.getCatalogItemById(id, includeDeleted);
}

export async function getCatalogItems(groupId?: string, includeDeleted = false): Promise<CatalogItem[]> {
  return catalogItemRepository.getCatalogItems(groupId, includeDeleted);
}

export async function searchCatalogItems(query: string): Promise<CatalogItem[]> {
  return catalogItemRepository.searchCatalogItems(query, (groupId) => {
    const group = menuGroupService.getGroupByIdSync(groupId);
    return group?.name;
  });
}

export async function updateCatalogItem(id: string, updates: UpdateCatalogItemInput, userId = 'system'): Promise<CatalogItem> {
  if (updates.groupId !== undefined && !await menuGroupService.groupExists(updates.groupId)) {
    throw new Error('ERR_GROUP_NOT_FOUND');
  }

  const currentItem = await catalogItemRepository.getCatalogItemById(id);
  const updatedItem = await catalogItemRepository.updateCatalogItem(id, updates);

  if (updates.suggestedPrice !== undefined && currentItem && currentItem.suggestedPrice !== updates.suggestedPrice) {
    await auditLogService.logPriceChange(id, userId, currentItem.suggestedPrice, updates.suggestedPrice);
  }
  return updatedItem;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  return catalogItemRepository.deleteCatalogItem(id);
}

export async function catalogItemExists(id: string): Promise<boolean> {
  return catalogItemRepository.catalogItemExists(id);
}

export function resetService(): void {
  catalogItemRepository.resetRepository();
}
