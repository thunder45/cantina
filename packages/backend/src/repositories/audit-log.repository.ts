import { AuditLog, CreateAuditLogInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.AUDIT_LOGS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

// In-memory for local dev
let auditLogs: Map<string, AuditLog> = new Map();

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const auditLog: AuditLog = {
    id: uuidv4(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    previousValue: input.previousValue,
    newValue: input.newValue,
    userId: input.userId,
    createdAt: new Date().toISOString(),
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: auditLog }));
  } else {
    auditLogs.set(auditLog.id, auditLog);
  }
  return auditLog;
}

export async function getAuditLogsByEntity(
  entityType: AuditLog['entityType'],
  entityId: string
): Promise<AuditLog[]> {
  if (isProduction) {
    const result = await docClient!.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'entityType-entityId-index',
      KeyConditionExpression: 'entityType = :et AND entityId = :ei',
      ExpressionAttributeValues: { ':et': entityType, ':ei': entityId },
    }));
    return ((result.Items || []) as AuditLog[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(auditLogs.values())
    .filter(log => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }));
    return ((result.Items || []) as AuditLog[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(auditLogs.values())
    .filter(log => log.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAuditLogsByDateRange(startDate: string, endDate: string): Promise<AuditLog[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'createdAt BETWEEN :start AND :end',
      ExpressionAttributeValues: { ':start': startDate, ':end': endDate },
    }));
    return ((result.Items || []) as AuditLog[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Array.from(auditLogs.values())
    .filter(log => {
      const logTime = new Date(log.createdAt).getTime();
      return logTime >= start && logTime <= end;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  if (isProduction) {
    const result = await docClient!.send(new ScanCommand({ TableName: TABLE_NAME }));
    return ((result.Items || []) as AuditLog[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return Array.from(auditLogs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function resetRepository(): void {
  auditLogs = new Map();
}

export function getAuditLogCount(): number {
  return auditLogs.size;
}
