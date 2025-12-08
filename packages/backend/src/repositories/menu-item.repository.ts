import { MenuItem, AddMenuItemInput, UpdateMenuItemInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.MENU_ITEMS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let menuItems: Map<string, MenuItem> = new Map();

export async function addMenuItem(eventId: string, input: AddMenuItemInput): Promise<MenuItem> {
  if (input.price <= 0) throw new Error('ERR_INVALID_PRICE');
  if (input.stock < 0) throw new Error('ERR_INVALID_STOCK');
  const trimmedDescription = input.description.trim();
  if (!trimmedDescription) throw new Error('ERR_EMPTY_NAME');

  const menuItem: MenuItem = {
    id: uuidv4(),
    eventId,
    catalogItemId: input.catalogItemId,
    description: trimmedDescription,
    price: input.price,
    stock: input.stock,
    soldCount: 0,
    groupId: input.groupId,
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: menuItem }));
  } else {
    menuItems.set(menuItem.id, menuItem);
  }
  return menuItem;
}

export async function getMenuItemById(id: string): Promise<MenuItem | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as MenuItem | undefined;
  }
  return menuItems.get(id);
}

// Sync for local dev
export function getMenuItemByIdSync(id: string): MenuItem | undefined {
  if (isProduction) throw new Error('Use async getMenuItemById in production');
  return menuItems.get(id);
}

export async function getMenuItemsByEvent(eventId: string): Promise<MenuItem[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'eventId-index',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
    }));
    return ((result.Items || []) as MenuItem[]).sort((a, b) => {
      const gc = a.groupId.localeCompare(b.groupId);
      return gc !== 0 ? gc : a.description.localeCompare(b.description);
    });
  }
  return Array.from(menuItems.values())
    .filter(i => i.eventId === eventId)
    .sort((a, b) => {
      const gc = a.groupId.localeCompare(b.groupId);
      return gc !== 0 ? gc : a.description.localeCompare(b.description);
    });
}

export async function updateMenuItem(id: string, updates: UpdateMenuItemInput): Promise<MenuItem> {
  const item = await getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  if (updates.price !== undefined && updates.price <= 0) throw new Error('ERR_INVALID_PRICE');
  if (updates.stock !== undefined && updates.stock < 0) throw new Error('ERR_INVALID_STOCK');

  const updated: MenuItem = { ...item, ...updates, version: item.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    menuItems.set(id, updated);
  }
  return updated;
}

export async function removeMenuItem(id: string): Promise<void> {
  const item = await getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');

  if (isProduction) {
    await docClient!.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
  } else {
    menuItems.delete(id);
  }
}

export async function menuItemExists(id: string): Promise<boolean> {
  const item = await getMenuItemById(id);
  return !!item;
}

export async function getAvailableStock(id: string): Promise<number> {
  const item = await getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  if (item.stock === 0) return Infinity;
  return item.stock - item.soldCount;
}

export async function isMenuItemAvailable(id: string): Promise<boolean> {
  const item = await getMenuItemById(id);
  if (!item) return false;
  if (item.stock === 0) return true;
  return item.soldCount < item.stock;
}

export async function incrementSoldCount(id: string, quantity: number): Promise<MenuItem> {
  const item = await getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  if (quantity <= 0) throw new Error('ERR_INVALID_QUANTITY');
  if (item.stock > 0 && quantity > item.stock - item.soldCount) {
    throw new Error('ERR_STOCK_INSUFFICIENT');
  }

  const updated: MenuItem = { ...item, soldCount: item.soldCount + quantity, version: item.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    menuItems.set(id, updated);
  }
  return updated;
}

export async function decrementSoldCount(id: string, quantity: number): Promise<MenuItem> {
  const item = await getMenuItemById(id);
  if (!item) throw new Error('ERR_MENU_ITEM_NOT_FOUND');
  if (quantity <= 0) throw new Error('ERR_INVALID_QUANTITY');

  const updated: MenuItem = { ...item, soldCount: Math.max(0, item.soldCount - quantity), version: item.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    menuItems.set(id, updated);
  }
  return updated;
}

export async function groupHasMenuItems(groupId: string, eventId: string): Promise<boolean> {
  const items = await getMenuItemsByEvent(eventId);
  return items.some(i => i.groupId === groupId);
}

export function resetRepository(): void {
  menuItems = new Map();
}

export async function getMenuItemCount(eventId?: string): Promise<number> {
  if (eventId) {
    const items = await getMenuItemsByEvent(eventId);
    return items.length;
  }
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME, Select: 'COUNT' }));
    return result.Count || 0;
  }
  return menuItems.size;
}
