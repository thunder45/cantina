import { z } from 'zod';

// Customer schemas
export const CreateCustomerSchema = z.object({
  name: z.string().transform(s => s.trim()).pipe(z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres')),
  initialBalance: z.number().optional().default(0),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().transform(s => s.trim()).pipe(z.string().min(1).max(100)).optional(),
  initialBalance: z.number().optional(),
});

export const TransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  paymentMethod: z.enum(['cash', 'card', 'transfer', 'balance', 'credit', 'gift']),
  description: z.string().optional(),
});

// Event schemas
export const CreateEventSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  dates: z.array(z.string()).min(1, 'Pelo menos uma data é obrigatória'),
  categories: z.array(z.string()).optional().default([]),
});

export const UpdateEventSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dates: z.array(z.string()).min(1).optional(),
  categories: z.array(z.string()).optional(),
});

// Group schemas
export const CreateGroupSchema = z.object({
  name: z.string().transform(s => s.trim()).pipe(z.string().min(1, 'Nome é obrigatório').max(100)),
});

// Category schemas
export const CreateCategorySchema = z.object({
  name: z.string().transform(s => s.trim()).pipe(z.string().min(1, 'Nome é obrigatório').max(100)),
});

// Catalog schemas
export const CreateCatalogItemSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  suggestedPrice: z.number().min(0, 'Preço deve ser positivo'),
  groupId: z.string().min(1, 'Grupo é obrigatório'),
});

export const UpdateCatalogItemSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  suggestedPrice: z.number().min(0).optional(),
  groupId: z.string().min(1).optional(),
});

// Menu Item schemas
export const AddMenuItemSchema = z.object({
  catalogItemId: z.string().min(1, 'Item do catálogo é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória').max(200),
  price: z.number().min(0, 'Preço deve ser positivo'),
  stock: z.number().int().min(0, 'Estoque deve ser positivo ou zero'),
  groupId: z.string().min(1, 'Grupo é obrigatório'),
});

export const UpdateMenuItemSchema = z.object({
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
});

// Order schemas
export const CreateOrderSchema = z.object({
  eventId: z.string().min(1, 'Evento é obrigatório'),
});

export const UpdateOrderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Item do menu é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
});

// Sale schemas
export const ConfirmSaleSchema = z.object({
  orderId: z.string().min(1, 'Pedido é obrigatório'),
  payments: z.array(z.object({
    method: z.enum(['cash', 'card', 'transfer', 'balance', 'credit', 'gift']),
    amount: z.number().positive(),
  })).min(1, 'Pelo menos uma forma de pagamento é obrigatória'),
  customerId: z.string().optional(),
});

export const RefundSaleSchema = z.object({
  reason: z.string().min(1, 'Motivo é obrigatório').max(500),
});

// Type exports
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateCatalogItemInput = z.infer<typeof CreateCatalogItemSchema>;
export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemSchema>;
export type AddMenuItemInput = z.infer<typeof AddMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderItemInput = z.infer<typeof UpdateOrderItemSchema>;
export type ConfirmSaleInput = z.infer<typeof ConfirmSaleSchema>;
export type RefundSaleInput = z.infer<typeof RefundSaleSchema>;
