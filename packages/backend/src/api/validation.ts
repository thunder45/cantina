import { z, ZodSchema } from 'zod';
import { error } from './response';
import { APIGatewayResponse } from './types';

export function validateBody<T>(
  body: string | null | undefined,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: APIGatewayResponse } {
  if (!body) {
    return { success: false, response: error('ERR_INVALID_BODY', 'Corpo da requisição é obrigatório', 400) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { success: false, response: error('ERR_INVALID_JSON', 'JSON inválido', 400) };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return { success: false, response: error('ERR_VALIDATION', result.error.issues[0].message, 400) };
  }

  return { success: true, data: result.data };
}

// Legacy helpers for backward compatibility
export function parseBody<T>(body: string | null | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

export function validateName(name: unknown, field = 'name'): { field: string; message: string } | null {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { field, message: `${field} não pode ser vazio` };
  }
  if (name.length > 100) {
    return { field, message: `${field} deve ter no máximo 100 caracteres` };
  }
  return null;
}

export function validatePrice(price: unknown, field = 'price'): { field: string; message: string } | null {
  if (typeof price !== 'number' || isNaN(price) || price <= 0) {
    return { field, message: `${field} deve ser maior que zero` };
  }
  return null;
}

export function validateQuantity(quantity: unknown, field = 'quantity'): { field: string; message: string } | null {
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return { field, message: `${field} deve ser um número` };
  }
  if (!Number.isInteger(quantity)) {
    return { field, message: `${field} deve ser um número inteiro` };
  }
  if (quantity <= 0) {
    return { field, message: `${field} deve ser maior que zero` };
  }
  return null;
}

export function validateStock(stock: unknown, field = 'stock'): { field: string; message: string } | null {
  if (typeof stock !== 'number' || isNaN(stock)) {
    return { field, message: `${field} deve ser um número` };
  }
  if (!Number.isInteger(stock)) {
    return { field, message: `${field} deve ser um número inteiro` };
  }
  if (stock < 0) {
    return { field, message: `${field} não pode ser negativo` };
  }
  return null;
}

export function validateId(id: unknown, field = 'id'): { field: string; message: string } | null {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return { field, message: `${field} é obrigatório` };
  }
  return null;
}

export function validateNonEmptyArray(arr: unknown, field = 'array'): { field: string; message: string } | null {
  if (!Array.isArray(arr)) {
    return { field, message: `${field} deve ser um array` };
  }
  if (arr.length === 0) {
    return { field, message: `${field} deve ter pelo menos um item` };
  }
  return null;
}

export function validateDateString(date: unknown, field = 'date'): { field: string; message: string } | null {
  if (typeof date !== 'string') {
    return { field, message: `${field} deve ser uma string` };
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { field, message: `${field} é um formato de data inválido` };
  }
  return null;
}

export function validatePaymentMethod(method: unknown, field = 'paymentMethod'): { field: string; message: string } | null {
  const validMethods = ['cash', 'card', 'transfer', 'balance', 'credit'];
  if (typeof method !== 'string' || !validMethods.includes(method)) {
    return { field, message: `${field} é inválido` };
  }
  return null;
}

export function validatePayments(payments: unknown): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  if (!Array.isArray(payments)) {
    errors.push({ field: 'payments', message: 'payments deve ser um array' });
    return errors;
  }
  if (payments.length === 0) {
    errors.push({ field: 'payments', message: 'payments deve ter pelo menos um item' });
    return errors;
  }
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const methodError = validatePaymentMethod(p?.method, `payments[${i}].method`);
    if (methodError) errors.push(methodError);
    if (typeof p?.amount !== 'number' || p.amount <= 0) {
      errors.push({ field: `payments[${i}].amount`, message: 'amount deve ser maior que zero' });
    }
  }
  return errors;
}

export function formatCurrency(value: number): string {
  return `€${value.toFixed(2)}`;
}

export function combineValidationErrors(
  ...errors: ({ field: string; message: string } | null)[]
): { valid: boolean; errors: { field: string; message: string }[] } {
  const filtered = errors.filter((e): e is { field: string; message: string } => e !== null);
  return { valid: filtered.length === 0, errors: filtered };
}
