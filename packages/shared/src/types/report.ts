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
