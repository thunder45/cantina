import { CatalogItem, CreateCatalogItemInput, UpdateCatalogItemInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.CATALOG_ITEMS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let catalogItems: Map<string, CatalogItem> = new Map();

export async function createCatalogItem(input: CreateCatalogItemInput): Promise<CatalogItem> {
  const trimmedDescription = input.description.trim();
  if (!trimmedDescription) throw new Error('ERR_EMPTY_NAME');
  if (input.suggestedPrice <= 0) throw new Error('ERR_INVALID_PRICE');

  const now = new Date().toISOString();
  const item: CatalogItem = {
    id: uuidv4(),
    description: trimmedDescription,
    suggestedPrice: input.suggestedPrice,
    groupId: input.groupId,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  } else {
    catalogItems.set(item.id, item);
  }
  return item;
}

export async function getCatalogItemById(id: string, includeDeleted = false): Promise<CatalogItem | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    const item = result.Item as CatalogItem | undefined;
    if (!item) return undefined;
    if (!includeDeleted && item.deletedAt) return undefined;
    return item;
  }
  const item = catalogItems.get(id);
  if (!item) return undefined;
  if (!includeDeleted && item.deletedAt) return undefined;
  return item;
}

export async function getCatalogItems(groupId?: string, includeDeleted = false): Promise<CatalogItem[]> {
  let items: CatalogItem[];
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    items = (result.Items || []) as CatalogItem[];
  } else {
    items = Array.from(catalogItems.values());
  }

  if (!includeDeleted) items = items.filter(i => !i.deletedAt);
  if (groupId) items = items.filter(i => i.groupId === groupId);

  return items.sort((a, b) => {
    const gc = a.groupId.localeCompare(b.groupId);
    return gc !== 0 ? gc : a.description.localeCompare(b.description);
  });
}

export async function searchCatalogItems(
  query: string,
  getGroupName: (groupId: string) => string | undefined
): Promise<CatalogItem[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const items = await getCatalogItems();
  return items.filter(item => {
    if (item.description.toLowerCase().includes(normalizedQuery)) return true;
    const groupName = getGroupName(item.groupId);
    return groupName?.toLowerCase().includes(normalizedQuery);
  });
}

export async function updateCatalogItem(id: string, updates: UpdateCatalogItemInput): Promise<CatalogItem> {
  const item = await getCatalogItemById(id);
  if (!item) throw new Error('ERR_ITEM_NOT_FOUND');

  if (updates.description !== undefined) {
    const trimmed = updates.description.trim();
    if (!trimmed) throw new Error('ERR_EMPTY_NAME');
    updates.description = trimmed;
  }
  if (updates.suggestedPrice !== undefined && updates.suggestedPrice <= 0) {
    throw new Error('ERR_INVALID_PRICE');
  }

  const updated: CatalogItem = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: item.version + 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    catalogItems.set(id, updated);
  }
  return updated;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  const item = await getCatalogItemById(id);
  if (!item) throw new Error('ERR_ITEM_NOT_FOUND');

  const deleted: CatalogItem = {
    ...item,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: item.version + 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: deleted }));
  } else {
    catalogItems.set(id, deleted);
  }
}

export async function catalogItemExists(id: string): Promise<boolean> {
  const item = await getCatalogItemById(id);
  return !!item;
}

export function resetRepository(): void {
  catalogItems = new Map();
}

export async function getItemCount(includeDeleted = false): Promise<number> {
  const items = await getCatalogItems(undefined, includeDeleted);
  return items.length;
}
