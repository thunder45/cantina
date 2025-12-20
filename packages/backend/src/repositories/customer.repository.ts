import { Customer, CustomerTransaction, CreateTransactionInput, DEFAULT_CREDIT_LIMIT } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.CUSTOMERS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let customers: Map<string, Customer> = new Map();
let transactions: Map<string, CustomerTransaction> = new Map();

function isCustomerRecord(item: any): item is Customer {
  return item && typeof item.name === 'string' && !item.id?.startsWith('tx#');
}

export async function createCustomer(name: string, creditLimit: number = DEFAULT_CREDIT_LIMIT): Promise<Customer> {
  const customer: Customer = {
    id: uuidv4(),
    name,
    creditLimit,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: customer }));
  } else {
    customers.set(customer.id, customer);
  }
  return customer;
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    const customer = result.Item as Customer | undefined;
    if (!customer || customer.deletedAt) return undefined;
    return customer;
  }
  const customer = customers.get(id);
  if (customer?.deletedAt) return undefined;
  return customer;
}

export async function customerExists(id: string): Promise<boolean> {
  return !!(await getCustomerById(id));
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  const customer = await getCustomerById(id);
  if (!customer) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const updated: Customer = { ...customer, ...updates, version: customer.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    customers.set(id, updated);
  }
  return updated;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const q = query.toLowerCase().trim();
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as any[])
      .filter(c => isCustomerRecord(c) && !c.deletedAt && c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(customers.values())
    .filter(c => !c.deletedAt && c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllCustomers(): Promise<Customer[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as any[])
      .filter(c => isCustomerRecord(c) && !c.deletedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(customers.values())
    .filter(c => !c.deletedAt)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteCustomer(id: string): Promise<Customer> {
  const customer = await getCustomerById(id);
  if (!customer) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const updated: Customer = { ...customer, deletedAt: new Date().toISOString(), version: customer.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    customers.set(id, updated);
  }
  return updated;
}

// === Transactions ===

export async function createTransaction(customerId: string, input: CreateTransactionInput): Promise<CustomerTransaction> {
  // For purchases: use paidAmount if provided, otherwise 0 (unpaid/credit)
  // For other types: amountPaid equals amount (fully settled)
  const amountPaid = input.type === 'purchase' 
    ? (input.paidAmount ?? 0) 
    : input.amount;
    
  const tx: CustomerTransaction = {
    id: uuidv4(),
    customerId,
    type: input.type,
    amount: input.amount,
    amountPaid,
    description: input.description,
    saleId: input.saleId,
    paymentMethod: input.paymentMethod,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...tx, id: `tx#${tx.id}`, pk: customerId },
    }));
  } else {
    transactions.set(tx.id, tx);
  }
  return tx;
}

export async function getTransactionsByCustomer(customerId: string): Promise<CustomerTransaction[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'pk = :cid AND begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':cid': customerId, ':prefix': 'tx#' },
    }));
    return ((result.Items || []) as any[])
      .map(t => ({ ...t, id: t.id.replace('tx#', '') }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(transactions.values())
    .filter(t => t.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTransactionBySaleId(saleId: string): Promise<CustomerTransaction | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'saleId = :sid',
      ExpressionAttributeValues: { ':sid': saleId },
    }));
    const items = (result.Items || []) as any[];
    if (items.length === 0) return undefined;
    return { ...items[0], id: items[0].id.replace('tx#', '') };
  }
  return Array.from(transactions.values()).find(t => t.saleId === saleId);
}

export async function calculateBalance(customerId: string): Promise<number> {
  const txs = await getTransactionsByCustomer(customerId);
  return txs.reduce((balance, tx) => {
    if (tx.type === 'deposit' || tx.type === 'refund') {
      return balance + tx.amount;
    } else {
      return balance - tx.amount;
    }
  }, 0);
}

export async function getUnpaidPurchases(customerId: string): Promise<CustomerTransaction[]> {
  const txs = await getTransactionsByCustomer(customerId);
  return txs
    .filter(tx => tx.type === 'purchase' && tx.amountPaid < tx.amount)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // FIFO: oldest first
}

export async function updateTransactionAmountPaid(txId: string, amountPaid: number): Promise<CustomerTransaction> {
  if (isProduction) {
    // For DynamoDB, we need to scan to find the transaction first
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'id = :tid',
      ExpressionAttributeValues: { ':tid': `tx#${txId}` },
    }));
    const items = (result.Items || []) as any[];
    if (items.length === 0) throw new Error('ERR_TRANSACTION_NOT_FOUND');
    const tx = { ...items[0], id: items[0].id.replace('tx#', ''), amountPaid };
    await docClient!.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { ...tx, id: `tx#${tx.id}` },
    }));
    return tx;
  }
  const tx = transactions.get(txId);
  if (!tx) throw new Error('ERR_TRANSACTION_NOT_FOUND');
  const updated = { ...tx, amountPaid };
  transactions.set(txId, updated);
  return updated;
}

export function resetRepository(): void {
  customers = new Map();
  transactions = new Map();
}

export async function getCustomerCount(): Promise<number> {
  return (await getAllCustomers()).length;
}

export async function getTransactionCount(): Promise<number> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'tx#' },
      Select: 'COUNT',
    }));
    return result.Count || 0;
  }
  return transactions.size;
}
