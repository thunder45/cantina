import { AuditLog, CreateAuditLogInput } from '@cantina-pos/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory storage for audit logs (simulates DynamoDB)
 * Key: auditLogId, Value: AuditLog
 * 
 * Requirements: 17.1, 17.2, 17.3
 */
let auditLogs: Map<string, AuditLog> = new Map();

/**
 * Create a new audit log entry
 * Requirements: 17.1, 17.2, 17.3
 * @param input - Audit log data
 * @returns Created AuditLog
 */
export function createAuditLog(input: CreateAuditLogInput): AuditLog {
  const id = uuidv4();
  
  const auditLog: AuditLog = {
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    previousValue: input.previousValue,
    newValue: input.newValue,
    userId: input.userId,
    createdAt: new Date().toISOString(),
  };
  
  auditLogs.set(id, auditLog);
  return auditLog;
}

/**
 * Get audit logs by entity
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns Array of AuditLogs sorted by creation date (newest first)
 */
export function getAuditLogsByEntity(
  entityType: AuditLog['entityType'],
  entityId: string
): AuditLog[] {
  return Array.from(auditLogs.values())
    .filter(log => log.entityType === entityType && log.entityId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


/**
 * Get audit logs by user
 * @param userId - User ID
 * @returns Array of AuditLogs sorted by creation date (newest first)
 */
export function getAuditLogsByUser(userId: string): AuditLog[] {
  return Array.from(auditLogs.values())
    .filter(log => log.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all audit logs within a date range
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Array of AuditLogs sorted by creation date (newest first)
 */
export function getAuditLogsByDateRange(startDate: string, endDate: string): AuditLog[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return Array.from(auditLogs.values())
    .filter(log => {
      const logTime = new Date(log.createdAt).getTime();
      return logTime >= start && logTime <= end;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all audit logs
 * @returns Array of all AuditLogs sorted by creation date (newest first)
 */
export function getAllAuditLogs(): AuditLog[] {
  return Array.from(auditLogs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Reset the repository (for testing purposes)
 */
export function resetRepository(): void {
  auditLogs = new Map();
}

/**
 * Get count of audit logs (for testing purposes)
 */
export function getAuditLogCount(): number {
  return auditLogs.size;
}
