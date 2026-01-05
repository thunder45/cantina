import { CustomerTransaction, CreateTransactionInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.CUSTOMER_TRANSACTIONS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

// In-memory store for local development
let transactions: Map<string, CustomerTransaction> = new Map();

export function getDocClient() { return docClient; }
export function getTableName() { return TABLE_NAME; }
export function isProductionMode() { return isProduction; }

export async function createTransaction(customerId: string, input: CreateTransactionInput): Promise<CustomerTransaction> {
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
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: tx }));
  } else {
    transactions.set(tx.id, tx);
  }
  return tx;
}

export async function getTransactionsByCustomer(customerId: string): Promise<CustomerTransaction[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
    }));
    // Sort by createdAt descending (most recent first)
    return ((result.Items || []) as CustomerTransaction[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(transactions.values())
    .filter(t => t.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTransactionBySaleId(saleId: string): Promise<CustomerTransaction | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'saleId-index',
      KeyConditionExpression: 'saleId = :sid',
      ExpressionAttributeValues: { ':sid': saleId },
    }));
    return (result.Items || [])[0] as CustomerTransaction | undefined;
  }
  return Array.from(transactions.values()).find(t => t.saleId === saleId);
}

export async function getUnpaidPurchases(customerId: string): Promise<CustomerTransaction[]> {
  const txs = await getTransactionsByCustomer(customerId);
  return txs
    .filter(tx => tx.type === 'purchase' && tx.amountPaid < tx.amount)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // FIFO: oldest first
}

export async function updateTransactionAmountPaid(customerId: string, txId: string, amountPaid: number): Promise<void> {
  if (isProduction) {
    await docClient!.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { customerId, id: txId },
      UpdateExpression: 'SET amountPaid = :ap',
      ExpressionAttributeValues: { ':ap': amountPaid },
    }));
  } else {
    const tx = transactions.get(txId);
    if (tx) tx.amountPaid = amountPaid;
  }
}

export async function deleteTransaction(customerId: string, txId: string): Promise<void> {
  if (isProduction) {
    const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    await docClient!.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { customerId, id: txId },
    }));
  } else {
    transactions.delete(txId);
  }
}

export function resetRepository(): void {
  transactions = new Map();
}
