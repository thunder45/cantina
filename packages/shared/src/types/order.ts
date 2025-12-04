/**
 * OrderItem - Item individual em um pedido
 */
export interface OrderItem {
  menuItemId: string;
  description: string;
  price: number;
  quantity: number;
}

/**
 * Order - Seleção de itens feita pelo cliente antes do pagamento
 */
export interface Order {
  id: string;
  eventId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  version: number; // For optimistic locking
}

export interface CreateOrderInput {
  eventId: string;
}

export interface AddOrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface UpdateOrderItemInput {
  quantity: number;
}
