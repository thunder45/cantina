import { Sale, PaymentPart, OrderItem, Refund } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.SALES_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

let sales: Map<string, Sale> = new Map();
let refunds: Map<string, Refund> = new Map();

export async function createSale(
  eventId: string,
  orderId: string,
  items: OrderItem[],
  total: number,
  payments: PaymentPart[],
  createdBy: string,
  customerId?: string
): Promise<Sale> {
  const hasCredit = payments.some(p => p.method === 'credit');
  const createdAt = new Date().toISOString();
  const sale: Sale = {
    id: uuidv4(),
    eventId,
    orderId,
    items: [...items],
    total,
    payments: [...payments],
    customerId,
    isPaid: !hasCredit,
    isRefunded: false,
    createdBy,
    createdAt,
    yearMonth: createdAt.substring(0, 7),
    version: 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: sale }));
  } else {
    sales.set(sale.id, sale);
  }
  return sale;
}

export async function getSaleById(id: string): Promise<Sale | undefined> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    return result.Item as Sale | undefined;
  }
  return sales.get(id);
}

export async function saleExists(id: string): Promise<boolean> {
  const sale = await getSaleById(id);
  return !!sale;
}

export async function getSalesByEvent(eventId: string): Promise<Sale[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'eventId-index',
      KeyConditionExpression: 'eventId = :eid',
      ExpressionAttributeValues: { ':eid': eventId },
    }));
    return ((result.Items || []) as Sale[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return Array.from(sales.values())
    .filter(s => s.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getSalesByCustomer(customerId: string): Promise<Sale[]> {
  if (isProduction) {
    // Need scan with filter for customerId (no GSI)
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'customerId = :cid',
      ExpressionAttributeValues: { ':cid': customerId },
    }));
    return ((result.Items || []) as Sale[]).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return Array.from(sales.values())
    .filter(s => s.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUnpaidSalesByCustomer(customerId: string): Promise<Sale[]> {
  const customerSales = await getSalesByCustomer(customerId);
  return customerSales.filter(s => !s.isPaid && !s.isRefunded);
}

export async function refundSale(saleId: string, reason: string, refundedBy: string): Promise<{ sale: Sale; refund: Refund }> {
  const sale = await getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');
  if (sale.isRefunded) throw new Error('ERR_SALE_ALREADY_REFUNDED');

  const now = new Date().toISOString();
  const refund: Refund = {
    id: uuidv4(),
    saleId,
    reason,
    createdBy: refundedBy,
    createdAt: now,
  };

  const updatedSale: Sale = {
    ...sale,
    isRefunded: true,
    refundReason: reason,
    refundedAt: now,
    version: sale.version + 1,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSale }));
    // Note: refunds stored in sale record, not separate table
  } else {
    sales.set(saleId, updatedSale);
    refunds.set(refund.id, refund);
  }

  return { sale: updatedSale, refund };
}

export async function markSaleAsPaid(saleId: string): Promise<Sale> {
  const sale = await getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');

  const updated: Sale = { ...sale, isPaid: true, version: sale.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    sales.set(saleId, updated);
  }
  return updated;
}

export async function updateSalePayments(saleId: string, payments: PaymentPart[], isPaid: boolean): Promise<Sale> {
  const sale = await getSaleById(saleId);
  if (!sale) throw new Error('ERR_SALE_NOT_FOUND');

  const updated: Sale = { ...sale, payments, isPaid, version: sale.version + 1 };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
  } else {
    sales.set(saleId, updated);
  }
  return updated;
}

export async function getRefundBySaleId(saleId: string): Promise<Refund | undefined> {
  // In production, refund info is in the sale record
  const sale = await getSaleById(saleId);
  if (sale?.isRefunded) {
    return {
      id: `refund-${saleId}`,
      saleId,
      reason: sale.refundReason || '',
      createdBy: 'system',
      createdAt: sale.refundedAt || '',
    };
  }
  return refunds.get(saleId) || Array.from(refunds.values()).find(r => r.saleId === saleId);
}

export function resetRepository(): void {
  sales = new Map();
  refunds = new Map();
}

export async function getSaleCount(eventId?: string): Promise<number> {
  if (eventId) {
    const evtSales = await getSalesByEvent(eventId);
    return evtSales.length;
  }
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME, Select: 'COUNT' }));
    return result.Count || 0;
  }
  return sales.size;
}

// Exports para transações atômicas cross-repository
export function getTableName(): string | undefined {
  return TABLE_NAME;
}
