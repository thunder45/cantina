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
 * GlobalReportFilter - Filtros para relatório global
 */
export interface GlobalReportFilter {
  categoryId?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  customerId?: string;
}

/**
 * GlobalReport - Relatório global independente de evento
 */
export interface GlobalReport {
  totalSales: number;
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
  itemsSold: ItemSoldSummary[];
  paymentBreakdown: PaymentBreakdown[];
  categoryBreakdown: CategoryBreakdownItem[];
  sales: GlobalSaleDetail[];
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: number;
  paid: number;
  pending: number;
}

export interface GlobalSaleDetail extends SaleDetail {
  eventId: string;
  eventName: string;
  categoryId: string;
  categoryName: string;
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
