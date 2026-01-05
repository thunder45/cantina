import * as customerService from '../customer.service';

describe('CustomerService', () => {
  beforeEach(() => {
    customerService.resetService();
  });

  describe('createCustomer', () => {
    it('should create a customer with valid name', async () => {
      const customer = await customerService.createCustomer('João Silva');
      
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('João Silva');
      expect(customer.createdAt).toBeDefined();
    });

    it('should create customer with initial balance', async () => {
      const customer = await customerService.createCustomer('Maria', 50);
      expect(customer.initialBalance).toBe(50);
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
      await expect(customerService.deposit(customer.id, 0, 'cash', 'user1')).rejects.toThrow('ERR_INVALID_AMOUNT');
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

    it('should allow purchase creating debt', async () => {
      const customer = await customerService.createCustomer('Test');
      
      await customerService.recordPurchase(customer.id, 50, 'sale-123', 'user1');
      
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(-50);
    });

    it('should allow any purchase amount (no credit limit)', async () => {
      const customer = await customerService.createCustomer('Test');
      await customerService.recordPurchase(customer.id, 1000, 'sale-123', 'user1');
      const balance = await customerService.getCustomerBalance(customer.id);
      expect(balance).toBe(-1000);
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

  describe('FIFO recalculation on initialBalance change', () => {
    it('should apply total available balance to oldest purchases first', async () => {
      // Setup: customer with purchases and deposits
      const customer = await customerService.createCustomer('FIFO Test', 0);
      
      // Simulate: deposit 200, purchase 100, purchase 50
      await customerService.deposit(customer.id, 200, 'cash', 'test');
      await customerService.recordPurchase(customer.id, 100, 'sale-1', 'test');
      await customerService.recordPurchase(customer.id, 50, 'sale-2', 'test');
      
      // Change initialBalance to trigger recalculation
      await customerService.updateCustomer(customer.id, { initialBalance: 0 });
      
      const history = await customerService.getCustomerHistory(customer.id);
      const txs = history.transactions;
      
      // Both purchases should be fully paid (200 available, 150 total purchases)
      const p1 = txs.find(t => t.saleId === 'sale-1');
      const p2 = txs.find(t => t.saleId === 'sale-2');
      
      expect(p1?.amountPaid).toBe(100); // Fully paid
      expect(p2?.amountPaid).toBe(50);  // Fully paid
      expect(history.balance).toBe(50); // 200 - 150 = 50
    });

    it('should mark older purchases as unpaid when initialBalance becomes negative', async () => {
      const customer = await customerService.createCustomer('FIFO Negative', 100);
      
      // With +100 initial: purchase 80 is fully paid
      await customerService.recordPurchase(customer.id, 80, 'sale-1', 'test');
      
      let history = await customerService.getCustomerHistory(customer.id);
      expect(history.transactions[0].amountPaid).toBe(80);
      
      // Change to -50 initial: only 0 available, purchase becomes unpaid
      await customerService.updateCustomer(customer.id, { initialBalance: -50 });
      
      history = await customerService.getCustomerHistory(customer.id);
      const tx = history.transactions.find(t => t.saleId === 'sale-1');
      
      expect(tx?.amountPaid).toBe(0); // No balance available
      expect(history.balance).toBe(-130); // -50 - 80 = -130
    });

    it('should pay oldest purchases first when balance is limited', async () => {
      const customer = await customerService.createCustomer('FIFO Limited', 0);
      
      // Deposit 100, then 3 purchases of 50 each
      await customerService.deposit(customer.id, 100, 'cash', 'test');
      await customerService.recordPurchase(customer.id, 50, 'sale-1', 'test');
      await customerService.recordPurchase(customer.id, 50, 'sale-2', 'test');
      await customerService.recordPurchase(customer.id, 50, 'sale-3', 'test');
      
      // Trigger recalc - 100 available for 150 in purchases
      await customerService.updateCustomer(customer.id, { initialBalance: 0 });
      
      const history = await customerService.getCustomerHistory(customer.id);
      const txs = history.transactions;
      
      const p1 = txs.find(t => t.saleId === 'sale-1');
      const p2 = txs.find(t => t.saleId === 'sale-2');
      const p3 = txs.find(t => t.saleId === 'sale-3');
      
      // FIFO: oldest gets paid first
      expect(p1?.amountPaid).toBe(50); // Fully paid
      expect(p2?.amountPaid).toBe(50); // Fully paid
      expect(p3?.amountPaid).toBe(0);  // No balance left
    });

    it('should handle deposits after purchases correctly', async () => {
      const customer = await customerService.createCustomer('FIFO Deposits After', 0);
      
      // Purchase first, deposit later
      await customerService.recordPurchase(customer.id, 100, 'sale-1', 'test');
      await customerService.deposit(customer.id, 150, 'cash', 'test');
      await customerService.recordPurchase(customer.id, 30, 'sale-2', 'test');
      
      // Trigger recalc
      await customerService.updateCustomer(customer.id, { initialBalance: 0 });
      
      const history = await customerService.getCustomerHistory(customer.id);
      const txs = history.transactions;
      
      const p1 = txs.find(t => t.saleId === 'sale-1');
      const p2 = txs.find(t => t.saleId === 'sale-2');
      
      // Total available: 150, purchases: 130
      // Both should be fully paid (deposit pays earlier purchase retroactively)
      expect(p1?.amountPaid).toBe(100);
      expect(p2?.amountPaid).toBe(30);
      expect(history.balance).toBe(20); // 150 - 130 = 20
    });
  });
});
