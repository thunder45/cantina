import { PaymentMethod } from './sale';

/**
 * EventReport - Relatório de vendas de um evento
 */
export interface EventReport {
  eventId: string;
  totalSales: number;
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
  itemsSold: ItemSoldSummary[];
  paymentBreakdown: PaymentBreakdown[];
  sales: SaleDetail[];
}

export interface SaleDetail {
  id: string;
  createdAt: string;
  total: number;
  payments: { method: PaymentMethod; amount: number }[];
  items: { description: string; quantity: number; price: number }[];
  customerName?: string;
  createdBy: string;
  refunded: boolean;
}

export interface ItemSoldSummary {
  description: string;
  quantity: number;
  total: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  total: number;
}

/**
 * StockReport - Relatório de estoque de um evento
 */
export interface StockReport {
  eventId: string;
  items: StockReportItem[];
}

export interface StockReportItem {
  description: string;
  initialStock: number;
  sold: number;
  available: number;
  isInfinite: boolean;
}

export interface ReportFilter {
  category?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * CategoryReport - Relatório agregado de uma categoria
 * Requirements: 11.2
 */
export interface CategoryReport {
  categoryId: string;
  categoryName: string;
  eventCount: number;
  totalSales: number;
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
  eventBreakdown: EventBreakdownItem[];
  paymentBreakdown: PaymentBreakdown[];
}

export interface EventBreakdownItem {
  eventId: string;
  eventName: string;
  total: number;
}
