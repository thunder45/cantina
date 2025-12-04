import { Order, OrderItem } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for orders (simulates DynamoDB)
 * Key: orderId, Value: Order
 */
let orders: Map<string, Order> = new Map();

/**
 * Create a new order
 * Requirements: 5.1
 * @param eventId - Event ID
 * @returns Created Order
 */
export function createOrder(eventId: string): Order {
  const id = uuidv4();
  
  const order: Order = {
    id,
    eventId,
    items: [],
    total: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  orders.set(id, order);
  return order;
}

/**
 * Get an order by ID
 * @param id - Order ID
 * @returns Order or undefined
 */
export function getOrderById(id: string): Order | undefined {
  return orders.get(id);
}

/**
 * Check if an order exists
 * @param id - Order ID
 * @returns true if order exists
 */
export function orderExists(id: string): boolean {
  return orders.has(id);
}

/**
 * Add an item to an order
 * Requirements: 5.2
 * @param orderId - Order ID
 * @param item - Order item to add
 * @returns Updated Order
 * @throws Error if order not found or not pending
 */
export function addItem(orderId: string, item: OrderItem): Order {
  const order = orders.get(orderId);
  
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  // Check if item already exists in order
  const existingIndex = order.items.findIndex(i => i.menuItemId === item.menuItemId);
  
  if (existingIndex >= 0) {
    // Update quantity of existing item
    order.items[existingIndex].quantity += item.quantity;
  } else {
    // Add new item
    order.items.push({ ...item });
  }
  
  // Recalculate total
  order.total = calculateTotal(order.items);
  
  orders.set(orderId, order);
  return order;
}

/**
 * Update item quantity in an order
 * Requirements: 5.3
 * @param orderId - Order ID
 * @param menuItemId - Menu item ID
 * @param quantity - New quantity
 * @returns Updated Order
 * @throws Error if order not found, not pending, or item not in order
 */
export function updateItemQuantity(orderId: string, menuItemId: string, quantity: number): Order {
  const order = orders.get(orderId);
  
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  const itemIndex = order.items.findIndex(i => i.menuItemId === menuItemId);
  
  if (itemIndex < 0) {
    throw new Error('ERR_ITEM_NOT_IN_ORDER');
  }
  
  if (quantity <= 0) {
    // Remove item if quantity is 0 or negative
    order.items.splice(itemIndex, 1);
  } else {
    order.items[itemIndex].quantity = quantity;
  }
  
  // Recalculate total
  order.total = calculateTotal(order.items);
  
  orders.set(orderId, order);
  return order;
}

/**
 * Remove an item from an order
 * Requirements: 5.4
 * @param orderId - Order ID
 * @param menuItemId - Menu item ID
 * @returns Updated Order
 * @throws Error if order not found, not pending, or item not in order
 */
export function removeItem(orderId: string, menuItemId: string): Order {
  const order = orders.get(orderId);
  
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  const itemIndex = order.items.findIndex(i => i.menuItemId === menuItemId);
  
  if (itemIndex < 0) {
    throw new Error('ERR_ITEM_NOT_IN_ORDER');
  }
  
  order.items.splice(itemIndex, 1);
  
  // Recalculate total
  order.total = calculateTotal(order.items);
  
  orders.set(orderId, order);
  return order;
}

/**
 * Update order status
 * @param orderId - Order ID
 * @param status - New status
 * @returns Updated Order
 * @throws Error if order not found
 */
export function updateOrderStatus(orderId: string, status: Order['status']): Order {
  const order = orders.get(orderId);
  
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  order.status = status;
  orders.set(orderId, order);
  return order;
}

/**
 * Calculate total from order items
 * Requirements: 5.2, 5.3, 5.4
 * @param items - Order items
 * @returns Total amount
 */
export function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Get orders by event
 * @param eventId - Event ID
 * @returns Array of Orders
 */
export function getOrdersByEvent(eventId: string): Order[] {
  return Array.from(orders.values())
    .filter(order => order.eventId === eventId);
}

/**
 * Clear all items from an order
 * Requirements: 13.3
 * @param orderId - Order ID
 * @returns Updated Order
 * @throws Error if order not found or not pending
 */
export function clearOrder(orderId: string): Order {
  const order = orders.get(orderId);
  
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  order.items = [];
  order.total = 0;
  
  orders.set(orderId, order);
  return order;
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  orders = new Map();
}

/**
 * Get count of orders (for testing purposes)
 * @param eventId - Optional filter by event
 */
export function getOrderCount(eventId?: string): number {
  if (eventId) {
    return Array.from(orders.values()).filter(order => order.eventId === eventId).length;
  }
  return orders.size;
}
