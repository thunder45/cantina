import { Order, OrderItem, AddOrderItemInput } from '@cantina-pos/shared';
import * as orderRepository from '../repositories/order.repository';
import * as eventRepository from '../repositories/event.repository';
import * as menuItemService from './menu-item.service';

/**
 * Create a new order for an event
 * Requirements: 5.1
 * @param eventId - Event ID
 * @returns Created Order
 * @throws Error if event not found
 */
export function createOrder(eventId: string): Order {
  // Validate event exists
  if (!eventRepository.eventExists(eventId)) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  return orderRepository.createOrder(eventId);
}

/**
 * Get an order by ID
 * @param orderId - Order ID
 * @returns Order
 * @throws Error if order not found
 */
export function getOrder(orderId: string): Order {
  const order = orderRepository.getOrderById(orderId);
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  return order;
}

/**
 * Get an order by ID (returns undefined if not found)
 * @param orderId - Order ID
 * @returns Order or undefined
 */
export function getOrderById(orderId: string): Order | undefined {
  return orderRepository.getOrderById(orderId);
}

/**
 * Add an item to an order
 * Requirements: 5.2, 6.3, 6.4
 * @param orderId - Order ID
 * @param input - Item to add (menuItemId, quantity)
 * @returns Updated Order
 * @throws Error if order not found, menu item not found, or validation fails
 */
export function addItem(orderId: string, input: AddOrderItemInput): Order {
  const order = orderRepository.getOrderById(orderId);
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  // Validate quantity is positive
  if (input.quantity <= 0) {
    throw new Error('ERR_INVALID_QUANTITY');
  }
  
  // Get menu item details
  const menuItem = menuItemService.getMenuItem(input.menuItemId);
  
  // Check stock availability and limit quantity if needed (Requirements: 6.4)
  const availableStock = menuItemService.getAvailableStock(input.menuItemId);
  
  // Calculate current quantity in order for this item
  const existingItem = order.items.find(i => i.menuItemId === input.menuItemId);
  const currentQuantityInOrder = existingItem ? existingItem.quantity : 0;
  
  // Calculate how much more can be added
  let quantityToAdd = input.quantity;
  if (availableStock !== Infinity) {
    const maxCanAdd = availableStock - currentQuantityInOrder;
    if (maxCanAdd <= 0) {
      throw new Error('ERR_STOCK_INSUFFICIENT');
    }
    if (quantityToAdd > maxCanAdd) {
      quantityToAdd = maxCanAdd; // Limit to available stock (Requirements: 6.4)
    }
  }
  
  const orderItem: OrderItem = {
    menuItemId: menuItem.id,
    description: menuItem.description,
    price: menuItem.price,
    quantity: quantityToAdd,
  };
  
  return orderRepository.addItem(orderId, orderItem);
}

/**
 * Update item quantity in an order
 * Requirements: 5.3, 6.4
 * @param orderId - Order ID
 * @param menuItemId - Menu item ID
 * @param quantity - New quantity
 * @returns Updated Order
 * @throws Error if order not found, item not in order, or validation fails
 */
export function updateItemQuantity(orderId: string, menuItemId: string, quantity: number): Order {
  const order = orderRepository.getOrderById(orderId);
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  // Validate quantity is non-negative
  if (quantity < 0) {
    throw new Error('ERR_INVALID_QUANTITY');
  }
  
  // If quantity is 0, remove the item
  if (quantity === 0) {
    return orderRepository.removeItem(orderId, menuItemId);
  }
  
  // Check stock availability (Requirements: 6.4)
  const availableStock = menuItemService.getAvailableStock(menuItemId);
  
  let finalQuantity = quantity;
  if (availableStock !== Infinity && quantity > availableStock) {
    finalQuantity = availableStock; // Limit to available stock
  }
  
  return orderRepository.updateItemQuantity(orderId, menuItemId, finalQuantity);
}

/**
 * Remove an item from an order
 * Requirements: 5.4
 * @param orderId - Order ID
 * @param menuItemId - Menu item ID
 * @returns Updated Order
 * @throws Error if order not found or item not in order
 */
export function removeItem(orderId: string, menuItemId: string): Order {
  return orderRepository.removeItem(orderId, menuItemId);
}

/**
 * Calculate total for an order
 * Requirements: 5.2, 5.3, 5.4
 * @param order - Order to calculate total for
 * @returns Total amount
 */
export function calculateTotal(order: Order): number {
  return orderRepository.calculateTotal(order.items);
}

/**
 * Clear all items from an order
 * Requirements: 13.3
 * @param orderId - Order ID
 * @returns Updated Order
 * @throws Error if order not found or not pending
 */
export function clearOrder(orderId: string): Order {
  return orderRepository.clearOrder(orderId);
}

/**
 * Cancel an order
 * Requirements: 13.1, 13.2
 * @param orderId - Order ID
 * @returns Cancelled Order
 * @throws Error if order not found or not pending
 */
export function cancelOrder(orderId: string): Order {
  const order = orderRepository.getOrderById(orderId);
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  // Mark order as cancelled (stock is not reserved, so no need to release)
  return orderRepository.updateOrderStatus(orderId, 'cancelled');
}

/**
 * Confirm an order (mark as confirmed)
 * @param orderId - Order ID
 * @returns Confirmed Order
 * @throws Error if order not found or not pending
 */
export function confirmOrder(orderId: string): Order {
  const order = orderRepository.getOrderById(orderId);
  if (!order) {
    throw new Error('ERR_ORDER_NOT_FOUND');
  }
  
  if (order.status !== 'pending') {
    throw new Error('ERR_ORDER_NOT_PENDING');
  }
  
  if (order.items.length === 0) {
    throw new Error('ERR_ORDER_EMPTY');
  }
  
  return orderRepository.updateOrderStatus(orderId, 'confirmed');
}

/**
 * Get orders by event
 * @param eventId - Event ID
 * @returns Array of Orders
 */
export function getOrdersByEvent(eventId: string): Order[] {
  return orderRepository.getOrdersByEvent(eventId);
}

/**
 * Check if an order exists
 * @param orderId - Order ID
 * @returns true if order exists
 */
export function orderExists(orderId: string): boolean {
  return orderRepository.orderExists(orderId);
}

/**
 * Reset the service (for testing purposes)
 */
export function resetService(): void {
  orderRepository.resetRepository();
}
