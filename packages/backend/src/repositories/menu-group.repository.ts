import { MenuGroup } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.MENU_GROUPS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

const DEFAULT_GROUPS: Omit<MenuGroup, 'id' | 'version'>[] = [
  { name: 'Refeição', order: 1, isDefault: true },
  { name: 'Bebida', order: 2, isDefault: true },
  { name: 'Sobremesa', order: 3, isDefault: true },
];

let menuGroups: Map<string, MenuGroup> = new Map();
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    if (!result.Items || result.Items.length === 0) {
      for (const group of DEFAULT_GROUPS) {
        const menuGroup: MenuGroup = { id: uuidv4(), ...group, version: 1 };
        await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: menuGroup }));
      }
    }
  } else {
    for (const group of DEFAULT_GROUPS) {
      const menuGroup: MenuGroup = { id: uuidv4(), ...group, version: 1 };
      menuGroups.set(menuGroup.id, menuGroup);
    }
  }
  initialized = true;
}

// Sync init for local dev
export function initializeDefaultGroups(): MenuGroup[] {
  if (isProduction || initialized) return Array.from(menuGroups.values());
  for (const group of DEFAULT_GROUPS) {
    const menuGroup: MenuGroup = { id: uuidv4(), ...group, version: 1 };
    menuGroups.set(menuGroup.id, menuGroup);
  }
  initialized = true;
  return Array.from(menuGroups.values());
}

export async function getGroups(): Promise<MenuGroup[]> {
  await ensureInitialized();
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as MenuGroup[]).sort((a, b) => a.order - b.order);
  }
  return Array.from(menuGroups.values()).sort((a, b) => a.order - b.order);
}

export async function getGroupById(id: string): Promise<MenuGroup | undefined> {
  await ensureInitialized();
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as MenuGroup | undefined;
  }
  return menuGroups.get(id);
}

// Sync version for local dev
export function getGroupByIdSync(id: string): MenuGroup | undefined {
  if (isProduction) throw new Error('Use async getGroupById in production');
  if (!initialized) initializeDefaultGroups();
  return menuGroups.get(id);
}

export async function createGroup(name: string): Promise<MenuGroup> {
  await ensureInitialized();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('ERR_EMPTY_NAME');

  const groups = await getGroups();
  const existing = groups.find(g => g.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) throw new Error('ERR_DUPLICATE_NAME');

  const maxOrder = Math.max(0, ...groups.map(g => g.order));
  const menuGroup: MenuGroup = {
    id: uuidv4(),
    name: trimmedName,
    order: maxOrder + 1,
    isDefault: false,
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: menuGroup }));
  } else {
    menuGroups.set(menuGroup.id, menuGroup);
  }
  return menuGroup;
}

export async function deleteGroup(id: string, hasAssociatedItems: (groupId: string) => boolean): Promise<void> {
  await ensureInitialized();
  const group = await getGroupById(id);
  if (!group) throw new Error('ERR_GROUP_NOT_FOUND');
  if (hasAssociatedItems(id)) throw new Error('ERR_GROUP_HAS_ITEMS');

  if (isProduction) {
    await docClient!.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
  } else {
    menuGroups.delete(id);
  }
}

export async function groupExists(id: string): Promise<boolean> {
  const group = await getGroupById(id);
  return !!group;
}

// Sync version for local dev
export function groupExistsSync(id: string): boolean {
  if (isProduction) throw new Error('Use async groupExists in production');
  if (!initialized) initializeDefaultGroups();
  return menuGroups.has(id);
}

export function resetRepository(): void {
  menuGroups = new Map();
  initialized = false;
}

export function isInitialized(): boolean {
  return initialized;
}
