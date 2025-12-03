/**
 * Event - Período de vendas que pode compreender um ou mais dias
 */
export interface Event {
  id: string;
  name: string;
  dates: string[]; // ISO date strings
  categories: string[];
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  name: string;
  dates: string[];
  categories: string[];
}

export interface UpdateEventStatusInput {
  status: 'active' | 'closed';
}
