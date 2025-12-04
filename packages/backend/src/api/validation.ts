/**
 * Input Validation Middleware
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate that a price is positive (> 0)
 * Requirements: 15.1
 */
export function validatePrice(price: unknown, field = 'price'): ValidationError | null {
  if (typeof price !== 'number' || isNaN(price)) {
    return { field, message: 'O preço deve ser um número válido' };
  }
  if (price <= 0) {
    return { field, message: 'O preço deve ser maior que zero' };
  }
  return null;
}

/**
 * Validate that a name is non-empty
 * Requirements: 15.2
 */
export function validateName(name: unknown, field = 'name'): ValidationError | null {
  if (typeof name !== 'string') {
    return { field, message: 'O nome deve ser uma string' };
  }
  if (!name.trim()) {
    return { field, message: 'O nome não pode estar vazio' };
  }
  return null;
}

/**
 * Validate that a quantity is positive (> 0)
 * Requirements: 15.3
 */
export function validateQuantity(quantity: unknown, field = 'quantity'): ValidationError | null {
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    return { field, message: 'A quantidade deve ser um número válido' };
  }
  if (quantity <= 0) {
    return { field, message: 'A quantidade deve ser maior que zero' };
  }
  if (!Number.isInteger(quantity)) {
    return { field, message: 'A quantidade deve ser um número inteiro' };
  }
  return null;
}

/**
 * Validate that a stock value is non-negative (>= 0)
 * Stock of 0 means infinite
 */
export function validateStock(stock: unknown, field = 'stock'): ValidationError | null {
  if (typeof stock !== 'number' || isNaN(stock)) {
    return { field, message: 'O estoque deve ser um número válido' };
  }
  if (stock < 0) {
    return { field, message: 'O estoque não pode ser negativo' };
  }
  if (!Number.isInteger(stock)) {
    return { field, message: 'O estoque deve ser um número inteiro' };
  }
  return null;
}

/**
 * Validate that a string is a valid ID (non-empty)
 */
export function validateId(id: unknown, field = 'id'): ValidationError | null {
  if (typeof id !== 'string' || !id.trim()) {
    return { field, message: `${field} é obrigatório` };
  }
  return null;
}

/**
 * Validate that an array is non-empty
 */
export function validateNonEmptyArray(arr: unknown, field: string): ValidationError | null {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { field, message: `${field} deve conter pelo menos um item` };
  }
  return null;
}

/**
 * Validate date string (ISO format)
 */
export function validateDateString(date: unknown, field = 'date'): ValidationError | null {
  if (typeof date !== 'string') {
    return { field, message: 'A data deve ser uma string' };
  }
  const parsed = Date.parse(date);
  if (isNaN(parsed)) {
    return { field, message: 'Formato de data inválido' };
  }
  return null;
}

/**
 * Validate payment method
 */
export function validatePaymentMethod(method: unknown, field = 'method'): ValidationError | null {
  const validMethods = ['cash', 'card', 'transfer', 'credit'];
  if (typeof method !== 'string' || !validMethods.includes(method)) {
    return { field, message: 'Método de pagamento inválido' };
  }
  return null;
}

/**
 * Validate payment parts array
 */
export function validatePayments(payments: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(payments)) {
    errors.push({ field: 'payments', message: 'Pagamentos deve ser um array' });
    return errors;
  }
  
  if (payments.length === 0) {
    errors.push({ field: 'payments', message: 'Pelo menos um pagamento é obrigatório' });
    return errors;
  }
  
  payments.forEach((payment, index) => {
    const methodError = validatePaymentMethod(payment?.method, `payments[${index}].method`);
    if (methodError) errors.push(methodError);
    
    if (typeof payment?.amount !== 'number' || payment.amount <= 0) {
      errors.push({ 
        field: `payments[${index}].amount`, 
        message: 'Valor do pagamento deve ser maior que zero' 
      });
    }
  });
  
  return errors;
}

/**
 * Format monetary value with 2 decimal places in Euro
 * Requirements: 15.4
 */
export function formatCurrency(value: number): string {
  return `€${value.toFixed(2)}`;
}

/**
 * Parse and validate JSON body
 */
export function parseBody<T>(body: string | undefined): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Combine multiple validation errors
 */
export function combineValidationErrors(...errors: (ValidationError | null)[]): ValidationResult {
  const validErrors = errors.filter((e): e is ValidationError => e !== null);
  return {
    valid: validErrors.length === 0,
    errors: validErrors,
  };
}
