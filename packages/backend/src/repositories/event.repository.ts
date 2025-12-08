import { Event, CreateEventInput, UpdateEventStatusInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.EVENTS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let events: Map<string, Event> = new Map();

function isValidISODate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return !isNaN(new Date(dateStr).getTime());
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error('ERR_EMPTY_NAME');
  if (!input.categoryId?.trim()) throw new Error('ERR_CATEGORY_REQUIRED');
  if (!input.dates?.length) throw new Error('ERR_INVALID_DATES');
  for (const date of input.dates) {
    if (!isValidISODate(date)) throw new Error('ERR_INVALID_DATE_FORMAT');
  }

  const now = new Date().toISOString();
  const event: Event = {
    id: uuidv4(),
    categoryId: input.categoryId.trim(),
    name: trimmedName,
    dates: [...input.dates],
    categories: [...(input.categories || [])],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: event }));
  } else {
    events.set(event.id, event);
  }
  return event;
}

export async function getEventById(id: string): Promise<Event | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as Event | undefined;
  }
  return events.get(id);
}

// Sync version for local dev only
export function getEventByIdSync(id: string): Event | undefined {
  if (isProduction) throw new Error('Use async getEventById in production');
  return events.get(id);
}

export async function getEvents(): Promise<Event[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as Event[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return Array.from(events.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getEventsByCategory(categoryId: string): Promise<Event[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'categoryId-index',
      KeyConditionExpression: 'categoryId = :cid',
      ExpressionAttributeValues: { ':cid': categoryId },
    }));
    return ((result.Items || []) as Event[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return Array.from(events.values())
    .filter(e => e.categoryId === categoryId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function countEventsByCategory(categoryId: string): Promise<number> {
  const evts = await getEventsByCategory(categoryId);
  return evts.length;
}

export async function updateEventStatus(id: string, input: UpdateEventStatusInput): Promise<Event> {
  const event = await getEventById(id);
  if (!event) throw new Error('ERR_EVENT_NOT_FOUND');

  const updated: Event = {
    ...event,
    status: input.status,
    updatedAt: new Date().toISOString(),
    version: event.version + 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    events.set(id, updated);
  }
  return updated;
}

export async function eventExists(id: string): Promise<boolean> {
  const event = await getEventById(id);
  return !!event;
}

// Sync version for local dev
export function eventExistsSync(id: string): boolean {
  if (isProduction) throw new Error('Use async eventExists in production');
  return events.has(id);
}

export function resetRepository(): void {
  events = new Map();
}

export async function getEventCount(): Promise<number> {
  const evts = await getEvents();
  return evts.length;
}
