/**
 * Event - Período de vendas que pertence a uma categoria, podendo compreender um ou mais dias
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export interface Event {
  id: string;
  categoryId: string; // Required - reference to EventCategory (Req 2.2)
  name: string;
  dates: string[]; // ISO date strings - supports multiple non-sequential dates (Req 2.3)
  categories: string[]; // Legacy field - kept for backward compatibility
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  version: number; // For optimistic locking
}

export interface CreateEventInput {
  categoryId: string; // Required (Req 2.2)
  name: string;
  dates: string[];
  categories?: string[]; // Optional - legacy field
}

export interface UpdateEventStatusInput {
  status: 'active' | 'closed';
}
