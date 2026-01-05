import { Customer } from '@cantina-pos/shared';
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

export function getDocClient() { return docClient; }
export function getTableName() { return TABLE_NAME; }
export function isProductionMode() { return isProduction; }

export async function createCustomer(name: string, initialBalance: number = 0): Promise<Customer> {
  const customer: Customer = {
    id: uuidv4(),
    name,
    initialBalance,
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
    return ((result.Items || []) as Customer[])
      .filter(c => !c.deletedAt && c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(customers.values())
    .filter(c => !c.deletedAt && c.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllCustomers(): Promise<Customer[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as Customer[])
      .filter(c => !c.deletedAt)
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

export async function getCustomerCount(): Promise<number> {
  return (await getAllCustomers()).length;
}

export function resetRepository(): void {
  customers = new Map();
}
