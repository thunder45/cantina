/**
 * Validation Module Tests
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */
import {
  validatePrice,
  validateName,
  validateQuantity,
  validateStock,
  validateId,
  validateNonEmptyArray,
  validateDateString,
  validatePaymentMethod,
  validatePayments,
  formatCurrency,
  parseBody,
  combineValidationErrors,
} from '../validation';

describe('Validation Module', () => {
  describe('validatePrice (Requirements: 15.1)', () => {
    it('should return null for valid positive price', () => {
      expect(validatePrice(10.50)).toBeNull();
      expect(validatePrice(0.01)).toBeNull();
      expect(validatePrice(1000)).toBeNull();
    });

    it('should return error for zero price', () => {
      const result = validatePrice(0);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('maior que zero');
    });

    it('should return error for negative price', () => {
      const result = validatePrice(-5);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('maior que zero');
    });

    it('should return error for non-number price', () => {
      expect(validatePrice('10')).not.toBeNull();
      expect(validatePrice(null)).not.toBeNull();
      expect(validatePrice(undefined)).not.toBeNull();
      expect(validatePrice(NaN)).not.toBeNull();
    });

    it('should use custom field name', () => {
      const result = validatePrice(-1, 'suggestedPrice');
      expect(result?.field).toBe('suggestedPrice');
    });
  });

  describe('validateName (Requirements: 15.2)', () => {
    it('should return null for valid non-empty name', () => {
      expect(validateName('Test Name')).toBeNull();
      expect(validateName('A')).toBeNull();
      expect(validateName('  Trimmed  ')).toBeNull(); // Has content after trim
    });

    it('should return error for empty string', () => {
      const result = validateName('');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('vazio');
    });

    it('should return error for whitespace-only string', () => {
      const result = validateName('   ');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('vazio');
    });

    it('should return error for non-string', () => {
      expect(validateName(123)).not.toBeNull();
      expect(validateName(null)).not.toBeNull();
      expect(validateName(undefined)).not.toBeNull();
    });

    it('should use custom field name', () => {
      const result = validateName('', 'description');
      expect(result?.field).toBe('description');
    });
  });

  describe('validateQuantity (Requirements: 15.3)', () => {
    it('should return null for valid positive integer', () => {
      expect(validateQuantity(1)).toBeNull();
      expect(validateQuantity(100)).toBeNull();
    });

    it('should return error for zero quantity', () => {
      const result = validateQuantity(0);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('maior que zero');
    });

    it('should return error for negative quantity', () => {
      const result = validateQuantity(-1);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('maior que zero');
    });

    it('should return error for non-integer', () => {
      const result = validateQuantity(1.5);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('inteiro');
    });

    it('should return error for non-number', () => {
      expect(validateQuantity('5')).not.toBeNull();
      expect(validateQuantity(null)).not.toBeNull();
    });
  });

  describe('validateStock', () => {
    it('should return null for valid non-negative integer', () => {
      expect(validateStock(0)).toBeNull(); // 0 = infinite
      expect(validateStock(10)).toBeNull();
    });

    it('should return error for negative stock', () => {
      const result = validateStock(-1);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('negativo');
    });

    it('should return error for non-integer', () => {
      const result = validateStock(1.5);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('inteiro');
    });
  });

  describe('validateId', () => {
    it('should return null for valid non-empty string', () => {
      expect(validateId('abc-123')).toBeNull();
      expect(validateId('1')).toBeNull();
    });

    it('should return error for empty string', () => {
      const result = validateId('');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('obrigatório');
    });

    it('should return error for non-string', () => {
      expect(validateId(123)).not.toBeNull();
      expect(validateId(null)).not.toBeNull();
    });
  });

  describe('validateNonEmptyArray', () => {
    it('should return null for non-empty array', () => {
      expect(validateNonEmptyArray([1, 2, 3], 'items')).toBeNull();
      expect(validateNonEmptyArray(['a'], 'items')).toBeNull();
    });

    it('should return error for empty array', () => {
      const result = validateNonEmptyArray([], 'items');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('pelo menos um item');
    });

    it('should return error for non-array', () => {
      expect(validateNonEmptyArray('not array', 'items')).not.toBeNull();
      expect(validateNonEmptyArray(null, 'items')).not.toBeNull();
    });
  });

  describe('validateDateString', () => {
    it('should return null for valid ISO date string', () => {
      expect(validateDateString('2024-01-15')).toBeNull();
      expect(validateDateString('2024-01-15T10:30:00Z')).toBeNull();
    });

    it('should return error for invalid date format', () => {
      const result = validateDateString('not-a-date');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('inválido');
    });

    it('should return error for non-string', () => {
      expect(validateDateString(123)).not.toBeNull();
      expect(validateDateString(null)).not.toBeNull();
    });
  });

  describe('validatePaymentMethod', () => {
    it('should return null for valid payment methods', () => {
      expect(validatePaymentMethod('cash')).toBeNull();
      expect(validatePaymentMethod('card')).toBeNull();
      expect(validatePaymentMethod('transfer')).toBeNull();
      expect(validatePaymentMethod('credit')).toBeNull();
    });

    it('should return error for invalid payment method', () => {
      const result = validatePaymentMethod('bitcoin');
      expect(result).not.toBeNull();
      expect(result?.message).toContain('inválido');
    });

    it('should return error for non-string', () => {
      expect(validatePaymentMethod(123)).not.toBeNull();
    });
  });

  describe('validatePayments', () => {
    it('should return empty array for valid payments', () => {
      const payments = [
        { method: 'cash', amount: 10 },
        { method: 'card', amount: 5 },
      ];
      expect(validatePayments(payments)).toHaveLength(0);
    });

    it('should return error for non-array', () => {
      const errors = validatePayments('not array');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for empty array', () => {
      const errors = validatePayments([]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for invalid payment method', () => {
      const payments = [{ method: 'bitcoin', amount: 10 }];
      const errors = validatePayments(payments);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for non-positive amount', () => {
      const payments = [{ method: 'cash', amount: 0 }];
      const errors = validatePayments(payments);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for negative amount', () => {
      const payments = [{ method: 'cash', amount: -5 }];
      const errors = validatePayments(payments);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency (Requirements: 15.4)', () => {
    it('should format with Euro symbol and two decimal places', () => {
      expect(formatCurrency(10)).toBe('€10.00');
      expect(formatCurrency(10.5)).toBe('€10.50');
      expect(formatCurrency(10.556)).toBe('€10.56'); // Rounds up
      expect(formatCurrency(10.554)).toBe('€10.55'); // Rounds down
      expect(formatCurrency(0)).toBe('€0.00');
    });
  });

  describe('parseBody', () => {
    it('should parse valid JSON', () => {
      const result = parseBody<{ name: string }>('{"name": "test"}');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for invalid JSON', () => {
      expect(parseBody('not json')).toBeNull();
      expect(parseBody('{invalid}')).toBeNull();
    });

    it('should return null for undefined body', () => {
      expect(parseBody(undefined)).toBeNull();
    });
  });

  describe('combineValidationErrors', () => {
    it('should return valid=true when no errors', () => {
      const result = combineValidationErrors(null, null, null);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid=false when there are errors', () => {
      const error1 = { field: 'name', message: 'Required' };
      const error2 = { field: 'price', message: 'Must be positive' };
      const result = combineValidationErrors(error1, null, error2);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});
