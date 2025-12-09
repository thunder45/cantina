import * as customerService from '../customer.service';
import { DEFAULT_CREDIT_LIMIT } from '@cantina-pos/shared';

describe('CustomerService', () => {
  beforeEach(() => {
    customerService.resetService();
  });

  describe('createCustomer', () => {
    it('should create a customer with valid name', async () => {
      const customer = await customerService.createCustomer('João Silva');
      
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('João Silva');
      expect(customer.creditLimit).toBe(DEFAULT_CREDIT_LIMIT);
      expect(customer.createdAt).toBeDefined();
    });

    it('should create customer with custom credit limit', async () => {
      const customer = await customerService.createCustomer('Maria', 200);
      expect(customer.creditLimit).toBe(200);
    });

    it('should trim whitespace from name', async () => {
      const customer = await customerService.createCustomer('  Maria Santos  ');
      expect(customer.name).toBe('Maria Santos');
    });

    it('should throw error for empty name', async () => {
      await expect(customerService.createCustomer('')).rejects.toThrow('ERR_EMPTY_NAME');
    });
  });

  describe('searchCustomers', () => {
    beforeEach(async () => {
      await customerService.createCustomer('João Silva');
      await customerService.createCustomer('Maria Santos');
      await customerService.createCustomer('João Pedro');
    });

    it('should return all customers when query is empty', async () => {
      const results = await customerService.searchCustomers('');
      expect(results).toHaveLength(3);
    });

    it('should filter customers by name', async () => {
      const results = await customerService.searchCustomers('João');
      expect(results).toHaveLength(2);
    });

    it('should be case insensitive', async () => {
      const results = await customerService.searchCustomers('silva');
      expect(results).toHaveLength(1);
    });
  });

  describe('getCustomer', () => {
    it('should return customer by ID', async () => {
      const created = await customerService.createCustomer('Test Customer');
      const customer = await customerService.getCustomer(created.id);
      expect(customer.name).toBe('Test Customer');
    });

    it('should throw error for non-existent customer', async () => {
      await expect(customerService.getCustomer('non-existent')).rejects.toThrow('ERR_CUSTOMER_NOT_FOUND');
    });
  });

  describe('deposit', () => {
    it('should add credit to customer balance', async () => {
      const customer = await customerService.createCustomer('Test');
      
      const tx = await customerService.deposit(customer.id, 50, 'cash', 'user1');
      
      expect(tx.type).toBe('deposit');
      expect(tx.amount).toBe(50);
      
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(50);
    });

    it('should throw error for invalid amount', async () => {
      const customer = await customerService.createCustomer('Test');
      await expect(customerService.deposit(customer.id, -10, 'cash', 'user1')).rejects.toThrow('ERR_INVALID_AMOUNT');
    });
  });

  describe('withdraw', () => {
    it('should return money to customer', async () => {
      const customer = await customerService.createCustomer('Test');
      await customerService.deposit(customer.id, 100, 'cash', 'user1');
      
      const tx = await customerService.withdraw(customer.id, 30, 'cash', 'user1');
      
      expect(tx.type).toBe('withdrawal');
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(70);
    });

    it('should throw error when insufficient balance', async () => {
      const customer = await customerService.createCustomer('Test');
      await expect(customerService.withdraw(customer.id, 50, 'cash', 'user1')).rejects.toThrow('ERR_INSUFFICIENT_BALANCE');
    });
  });

  describe('recordPurchase', () => {
    it('should debit customer balance', async () => {
      const customer = await customerService.createCustomer('Test');
      await customerService.deposit(customer.id, 100, 'cash', 'user1');
      
      await customerService.recordPurchase(customer.id, 30, 'sale-123', 'user1');
      
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(70);
    });

    it('should allow purchase within credit limit', async () => {
      const customer = await customerService.createCustomer('Test', 100);
      
      await customerService.recordPurchase(customer.id, 50, 'sale-123', 'user1');
      
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(-50);
    });

    it('should throw error when exceeds credit limit', async () => {
      const customer = await customerService.createCustomer('Test', 50);
      await expect(customerService.recordPurchase(customer.id, 100, 'sale-123', 'user1'))
        .rejects.toThrow('ERR_CREDIT_LIMIT_EXCEEDED');
    });
  });

  describe('recordRefund', () => {
    it('should credit customer balance on refund', async () => {
      const customer = await customerService.createCustomer('Test');
      await customerService.recordPurchase(customer.id, 50, 'sale-123', 'user1');
      
      await customerService.recordRefund(customer.id, 50, 'sale-123', 'user1');
      
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(0);
    });
  });

  describe('canPurchase', () => {
    it('should return true when within credit limit', async () => {
      const customer = await customerService.createCustomer('Test', 100);
      const result = await customerService.canPurchase(customer.id, 50);
      expect(result.allowed).toBe(true);
      expect(result.availableCredit).toBe(100);
    });

    it('should return false when exceeds credit limit', async () => {
      const customer = await customerService.createCustomer('Test', 50);
      const result = await customerService.canPurchase(customer.id, 100);
      expect(result.allowed).toBe(false);
    });
  });

  describe('updateCreditLimit', () => {
    it('should update credit limit', async () => {
      const customer = await customerService.createCustomer('Test');
      const updated = await customerService.updateCreditLimit(customer.id, 200);
      expect(updated.creditLimit).toBe(200);
    });

    it('should throw error for negative limit', async () => {
      const customer = await customerService.createCustomer('Test');
      await expect(customerService.updateCreditLimit(customer.id, -10)).rejects.toThrow('ERR_INVALID_CREDIT_LIMIT');
    });
  });

  describe('getCustomerHistory', () => {
    it('should return transactions and balance', async () => {
      const customer = await customerService.createCustomer('Test');
      await customerService.deposit(customer.id, 100, 'cash', 'user1');
      await customerService.recordPurchase(customer.id, 30, 'sale-1', 'user1');
      
      const history = await customerService.getCustomerHistory(customer.id);
      
      expect(history.transactions).toHaveLength(2);
      expect(history.balance).toBe(70);
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete a customer', async () => {
      const customer = await customerService.createCustomer('To Delete');
      const deleted = await customerService.deleteCustomer(customer.id);
      expect(deleted.deletedAt).toBeDefined();
    });

    it('should throw error for non-existent customer', async () => {
      await expect(customerService.deleteCustomer('non-existent')).rejects.toThrow('ERR_CUSTOMER_NOT_FOUND');
    });
  });
});
