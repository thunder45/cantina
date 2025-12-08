import { Customer, CustomerPayment, PaymentPart } from '@cantina-pos/shared';
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
let customerPayments: Map<string, CustomerPayment> = new Map();

export async function createCustomer(name: string): Promise<Customer> {
  const customer: Customer = {
    id: uuidv4(),
    name,
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
    if (customer?.deletedAt) return undefined;
    return customer;
  }
  const customer = customers.get(id);
  if (customer?.deletedAt) return undefined;
  return customer;
}

export async function customerExists(id: string): Promise<boolean> {
  const customer = await getCustomerById(id);
  return !!customer;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const normalizedQuery = query.toLowerCase().trim();
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as Customer[])
      .filter(c => !c.deletedAt && c.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(customers.values())
    .filter(c => !c.deletedAt && c.name.toLowerCase().includes(normalizedQuery))
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
  let customer: Customer | undefined;
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    customer = result.Item as Customer | undefined;
  } else {
    customer = customers.get(id);
  }

  if (!customer || customer.deletedAt) throw new Error('ERR_CUSTOMER_NOT_FOUND');

  const updated: Customer = {
    ...customer,
    deletedAt: new Date().toISOString(),
    version: customer.version + 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    customers.set(id, updated);
  }
  return updated;
}

export async function registerPayment(customerId: string, payments: PaymentPart[]): Promise<CustomerPayment> {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const payment: CustomerPayment = {
    id: uuidv4(),
    customerId,
    payments: [...payments],
    totalAmount,
    createdAt: new Date().toISOString(),
    version: 1,
  };

  // Store payments embedded in customer record for production
  if (isProduction) {
    // For simplicity, store as separate scan-able items with type prefix
    await docClient!.send(new PutCommand({ 
      TableName: TABLE_NAME, 
      Item: { ...payment, id: `payment#${payment.id}`, pk: customerId } 
    }));
  } else {
    customerPayments.set(payment.id, payment);
  }
  return payment;
}

export async function getPaymentsByCustomer(customerId: string): Promise<CustomerPayment[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'pk = :cid AND begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':cid': customerId, ':prefix': 'payment#' },
    }));
    return ((result.Items || []) as CustomerPayment[])
      .map(p => ({ ...p, id: p.id.replace('payment#', '') }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(customerPayments.values())
    .filter(p => p.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTotalPaymentsByCustomer(customerId: string): Promise<number> {
  const payments = await getPaymentsByCustomer(customerId);
  return payments.reduce((sum, p) => sum + p.totalAmount, 0);
}

export function resetRepository(): void {
  customers = new Map();
  customerPayments = new Map();
}

export async function getCustomerCount(): Promise<number> {
  const all = await getAllCustomers();
  return all.length;
}

export async function getPaymentCount(): Promise<number> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'payment#' },
      Select: 'COUNT',
    }));
    return result.Count || 0;
  }
  return customerPayments.size;
}
