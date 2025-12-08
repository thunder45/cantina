import { Order, OrderItem, AddOrderItemInput } from '@cantina-pos/shared';
import * as orderRepository from '../repositories/order.repository';
import * as eventRepository from '../repositories/event.repository';
import * as menuItemService from './menu-item.service';

export async function createOrder(eventId: string): Promise<Order> {
  if (!await eventRepository.eventExists(eventId)) throw new Error('ERR_EVENT_NOT_FOUND');
  return orderRepository.createOrder(eventId);
}

export async function getOrder(orderId: string): Promise<Order> {
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  return order;
}

export async function getOrderById(orderId: string): Promise<Order | undefined> {
  return orderRepository.getOrderById(orderId);
}

export async function addItem(orderId: string, input: AddOrderItemInput): Promise<Order> {
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (input.quantity <= 0) throw new Error('ERR_INVALID_QUANTITY');

  const menuItem = await menuItemService.getMenuItem(input.menuItemId);
  const availableStock = await menuItemService.getAvailableStock(input.menuItemId);
  const existingItem = order.items.find(i => i.menuItemId === input.menuItemId);
  const currentQuantityInOrder = existingItem?.quantity || 0;

  let quantityToAdd = input.quantity;
  if (availableStock !== Infinity) {
    const maxCanAdd = availableStock - currentQuantityInOrder;
    if (maxCanAdd <= 0) throw new Error('ERR_STOCK_INSUFFICIENT');
    if (quantityToAdd > maxCanAdd) quantityToAdd = maxCanAdd;
  }

  const orderItem: OrderItem = {
    menuItemId: menuItem.id,
    description: menuItem.description,
    price: menuItem.price,
    quantity: quantityToAdd,
  };
  return orderRepository.addItem(orderId, orderItem);
}

export async function updateItemQuantity(orderId: string, menuItemId: string, quantity: number): Promise<Order> {
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (quantity < 0) throw new Error('ERR_INVALID_QUANTITY');
  if (quantity === 0) return orderRepository.removeItem(orderId, menuItemId);

  const availableStock = await menuItemService.getAvailableStock(menuItemId);
  let finalQuantity = quantity;
  if (availableStock !== Infinity && quantity > availableStock) finalQuantity = availableStock;

  return orderRepository.updateItemQuantity(orderId, menuItemId, finalQuantity);
}

export async function removeItem(orderId: string, menuItemId: string): Promise<Order> {
  return orderRepository.removeItem(orderId, menuItemId);
}

export function calculateTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export async function clearOrder(orderId: string): Promise<Order> {
  return orderRepository.clearOrder(orderId);
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');
  return orderRepository.updateOrderStatus(orderId, 'cancelled');
}

export async function confirmOrder(orderId: string): Promise<Order> {
  const order = await orderRepository.getOrderById(orderId);
  if (!order) throw new Error('ERR_ORDER_NOT_FOUND');
  if (order.status !== 'pending') throw new Error('ERR_ORDER_NOT_PENDING');
  if (order.items.length === 0) throw new Error('ERR_ORDER_EMPTY');
  return orderRepository.updateOrderStatus(orderId, 'confirmed');
}

export async function getOrdersByEvent(eventId: string): Promise<Order[]> {
  return orderRepository.getOrdersByEvent(eventId);
}

export async function orderExists(orderId: string): Promise<boolean> {
  return orderRepository.orderExists(orderId);
}

export function resetService(): void {
  orderRepository.resetRepository();
}
