/**
 * AuditLog - Registro de auditoria para rastreabilidade
 */
export interface AuditLog {
  id: string;
  entityType: 'sale' | 'payment' | 'item' | 'price';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'refund';
  previousValue?: string;
  newValue?: string;
  userId: string;
  createdAt: string;
}

export interface CreateAuditLogInput {
  entityType: AuditLog['entityType'];
  entityId: string;
  action: AuditLog['action'];
  previousValue?: string;
  newValue?: string;
  userId: string;
}
