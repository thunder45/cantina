import { Order, OrderItem } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.ORDERS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let orders: Map<string, Order> = new Map();

export async function createOrder(eventId: string): Promise<Order> {
  const order: Order = {
    id: uuidv4(),
    eventId,
    items: [],
    total: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: order }));
  } else {
    orders.set(order.id, order);
  }
  return order;
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as Order | undefined;
  }
  return orders.get(id);
}

export async function orderExists(id: string): Promise<boolean> {
  const order = await getOrderById(id);
  return !!order;
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function saveOrder(order: Order): Promise<void> {
  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: order }));
  } else {
    orders.set(order.id, order);
  }
}

export async function addItem(orderId: string, item: OrderItem): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');

  const existingIndex = order.items.findIndex(i => i.menuItemId === item.menuItemId);
  if (existingIndex >= 0) {
    order.items[existingIndex].quantity += item.quantity;
  } else {
    order.items.push({ ...item });
  }
  order.total = calculateTotal(order.items);

  await saveOrder(order);
  return order;
}

export async function updateItemQuantity(orderId: string, menuItemId: string, quantity: number): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');

  const itemIndex = order.items.findIndex(i => i.menuItemId === menuItemId);
  if (itemIndex < 0) throw new Error('ERR_ITEM_NOT_IN_ORDER');

  if (quantity <= 0) {
    order.items.splice(itemIndex, 1);
  } else {
    order.items[itemIndex].quantity = quantity;
  }
  order.total = calculateTotal(order.items);

  await saveOrder(order);
  return order;
}

export async function removeItem(orderId: string, menuItemId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');

  const itemIndex = order.items.findIndex(i => i.menuItemId === menuItemId);
  if (itemIndex < 0) throw new Error('ERR_ITEM_NOT_IN_ORDER');

  order.items.splice(itemIndex, 1);
  order.total = calculateTotal(order.items);

  await saveOrder(order);
  return order;
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');

  order.status = status;
  await saveOrder(order);
  return order;
}

export async function getOrdersByEvent(eventId: string): Promise<Order[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'eventId-index',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
    }));
    return (result.Items || []) as Order[];
  }
  return Array.from(orders.values()).filter(o => o.eventId === eventId);
}

export async function clearOrder(orderId: string): Promise<Order> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');

  order.items = [];
  order.total = 0;

  await saveOrder(order);
  return order;
}

export function resetRepository(): void {
  orders = new Map();
}

export async function getOrderCount(eventId?: string): Promise<number> {
  if (eventId) {
    const evtOrders = await getOrdersByEvent(eventId);
    return evtOrders.length;
  }
  if (isProduction) {
    // For production, we'd need a scan - avoid for now
    return 0;
  }
  return orders.size;
}
