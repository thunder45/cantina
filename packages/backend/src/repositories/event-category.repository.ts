import { EventCategory, CreateEventCategoryInput, UpdateEventCategoryInput, DEFAULT_CATEGORY_NAMES } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.CATEGORIES_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  const client = new DynamoDBClient({});
  docClient = DynamoDBDocumentClient.from(client);
}

// In-memory storage for local development
let categories: Map<string, EventCategory> = new Map();
let initialized = false;

// Sync initialization for local dev
export function initializeDefaultCategories(): void {
  if (isProduction || initialized) return;
  const now = new Date().toISOString();
  for (const name of DEFAULT_CATEGORY_NAMES) {
    const id = uuidv4();
    categories.set(id, { id, name, isDefault: true, createdAt: now, updatedAt: now, version: 1 });
  }
  initialized = true;
}

// Async initialization for production
async function ensureInitialized(): Promise<void> {
  if (!isProduction) {
    initializeDefaultCategories();
    return;
  }
  if (initialized) return;
  
  const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
  if (!result.Items || result.Items.length === 0) {
    const now = new Date().toISOString();
    for (const name of DEFAULT_CATEGORY_NAMES) {
      const category: EventCategory = { id: uuidv4(), name, isDefault: true, createdAt: now, updatedAt: now, version: 1 };
      await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: category }));
    }
  }
  initialized = true;
}

export async function createCategory(input: CreateEventCategoryInput): Promise<EventCategory> {
  await ensureInitialized();
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error('ERR_EMPTY_NAME');
  
  const now = new Date().toISOString();
  const category: EventCategory = { id: uuidv4(), name: trimmedName, isDefault: false, createdAt: now, updatedAt: now, version: 1 };
  
  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: category }));
  } else {
    categories.set(category.id, category);
  }
  return category;
}

export async function getCategoryById(id: string): Promise<EventCategory | undefined> {
  await ensureInitialized();
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as EventCategory | undefined;
  }
  return categories.get(id);
}

// Sync version for backward compatibility (local only)
export function getCategoryByIdSync(id: string): EventCategory | undefined {
  if (isProduction) throw new Error('Use async getCategoryById in production');
  initializeDefaultCategories();
  return categories.get(id);
}

export async function getCategories(): Promise<EventCategory[]> {
  await ensureInitialized();
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as EventCategory[]).sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function categoryExists(id: string): Promise<boolean> {
  const cat = await getCategoryById(id);
  return !!cat;
}

// Sync version for backward compatibility
export function categoryExistsSync(id: string): boolean {
  if (isProduction) throw new Error('Use async categoryExists in production');
  initializeDefaultCategories();
  return categories.has(id);
}

export async function updateCategory(id: string, input: UpdateEventCategoryInput): Promise<EventCategory> {
  const category = await getCategoryById(id);
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  
  const updated: EventCategory = { ...category, ...input, updatedAt: new Date().toISOString(), version: category.version + 1 };
  
  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    categories.set(id, updated);
  }
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  if (isProduction) {
    await docClient!.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
  } else {
    categories.delete(id);
  }
}

export function resetRepository(): void {
  categories = new Map();
  initialized = false;
}

export async function getCategoryCount(): Promise<number> {
  const cats = await getCategories();
  return cats.length;
}
