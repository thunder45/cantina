import { EventReport, StockReport, ReportFilter, PaymentMethod, CategoryReport } from '@cantina-pos/shared';
import * as reportRepository from '../repositories/report.repository';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';

/**
 * Get event report with optional filtering
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * @param eventId - Event ID
 * @param filter - Optional filter (category, period)
 * @returns EventReport
 * @throws Error if event not found
 */
export function getEventReport(eventId: string, filter?: ReportFilter): EventReport {
  // Verify event exists
  const event = eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  return reportRepository.aggregateEventReport(eventId, filter);
}

/**
 * Get report filtered by period across all events
 * Requirements: 10.4
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns EventReport with aggregated data
 */
export function getReportByPeriod(startDate: string, endDate: string): EventReport {
  // Get all events
  const events = eventRepository.getEvents();
  
  // Aggregate reports from all events
  let totalSales = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalRefunded = 0;
  
  const itemsMap = new Map<string, { description: string; quantity: number; total: number }>();
  const paymentMap = new Map<PaymentMethod, number>();
  
  for (const event of events) {
    const report = reportRepository.aggregateEventReport(event.id, { startDate, endDate });
    
    totalSales += report.totalSales;
    totalPaid += report.totalPaid;
    totalPending += report.totalPending;
    totalRefunded += report.totalRefunded;
    
    // Merge items
    for (const item of report.itemsSold) {
      const existing = itemsMap.get(item.description);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.total;
      } else {
        itemsMap.set(item.description, { ...item });
      }
    }
    
    // Merge payments
    for (const payment of report.paymentBreakdown) {
      const current = paymentMap.get(payment.method) || 0;
      paymentMap.set(payment.method, current + payment.total);
    }
  }
  
  return {
    eventId: 'all',
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    itemsSold: Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity),
    paymentBreakdown: Array.from(paymentMap.entries())
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total),
  };
}

/**
 * Get category report with aggregated data from all events
 * Requirements: 11.2
 * @param categoryId - Category ID
 * @returns CategoryReport
 * @throws Error if category not found
 */
export function getCategoryReport(categoryId: string): CategoryReport {
  // Verify category exists
  const category = eventCategoryRepository.getCategoryById(categoryId);
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  return reportRepository.aggregateCategoryReport(categoryId);
}

/**
 * Get stock report for an event
 * Requirements: 10.5
 * @param eventId - Event ID
 * @returns StockReport
 * @throws Error if event not found
 */
export function getStockReport(eventId: string): StockReport {
  // Verify event exists
  const event = eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('ERR_EVENT_NOT_FOUND');
  }
  
  return reportRepository.generateStockReport(eventId);
}

/**
 * Escape a string for CSV format
 * Handles quotes by doubling them per CSV standard
 * @param value - String to escape
 * @returns Escaped string wrapped in quotes
 */
function escapeCSV(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Export event report to CSV format
 * Requirements: 10.6
 * @param eventId - Event ID
 * @returns CSV string
 * @throws Error if event not found
 */
export function exportReportCSV(eventId: string): string {
  const report = getEventReport(eventId);
  const stockReport = getStockReport(eventId);
  const event = eventRepository.getEventById(eventId);
  
  const lines: string[] = [];
  
  // Header
  lines.push(`Relatório de Vendas - ${event?.name || eventId}`);
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push('');
  
  // Summary
  lines.push('RESUMO');
  lines.push(`Total de Vendas,€${report.totalSales.toFixed(2)}`);
  lines.push(`Total Pago,€${report.totalPaid.toFixed(2)}`);
  lines.push(`Total Pendente,€${report.totalPending.toFixed(2)}`);
  lines.push(`Total Estornado,€${report.totalRefunded.toFixed(2)}`);
  lines.push('');
  
  // Items sold
  lines.push('ITENS VENDIDOS');
  lines.push('Descrição,Quantidade,Total');
  for (const item of report.itemsSold) {
    lines.push(`${escapeCSV(item.description)},${item.quantity},€${item.total.toFixed(2)}`);
  }
  lines.push('');
  
  // Payment breakdown
  lines.push('FORMAS DE PAGAMENTO');
  lines.push('Método,Total');
  for (const payment of report.paymentBreakdown) {
    const methodName = translatePaymentMethod(payment.method);
    lines.push(`${methodName},€${payment.total.toFixed(2)}`);
  }
  lines.push('');
  
  // Stock report
  lines.push('RELATÓRIO DE ESTOQUE');
  lines.push('Descrição,Estoque Inicial,Vendido,Disponível,Infinito');
  for (const item of stockReport.items) {
    const available = item.isInfinite ? 'N/A' : item.available.toString();
    const initial = item.isInfinite ? 'N/A' : item.initialStock.toString();
    lines.push(`${escapeCSV(item.description)},${initial},${item.sold},${available},${item.isInfinite ? 'Sim' : 'Não'}`);
  }
  
  return lines.join('\n');
}

/**
 * Translate payment method to Portuguese
 */
function translatePaymentMethod(method: PaymentMethod): string {
  const translations: Record<PaymentMethod, string> = {
    cash: 'Dinheiro',
    card: 'Cartão',
    transfer: 'Transferência',
    credit: 'Fiado',
  };
  return translations[method] || method;
}

/**
 * Export category report to CSV format
 * Requirements: 11.6
 * @param categoryId - Category ID
 * @returns CSV string
 * @throws Error if category not found
 */
export function exportCategoryReportCSV(categoryId: string): string {
  const report = getCategoryReport(categoryId);
  
  const lines: string[] = [];
  
  // Header
  lines.push(`Relatório de Categoria - ${report.categoryName}`);
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push(`Total de Eventos: ${report.eventCount}`);
  lines.push('');
  
  // Summary
  lines.push('RESUMO');
  lines.push(`Total de Vendas,€${report.totalSales.toFixed(2)}`);
  lines.push(`Total Pago,€${report.totalPaid.toFixed(2)}`);
  lines.push(`Total Pendente,€${report.totalPending.toFixed(2)}`);
  lines.push(`Total Estornado,€${report.totalRefunded.toFixed(2)}`);
  lines.push('');
  
  // Event breakdown
  lines.push('EVENTOS');
  lines.push('Nome do Evento,Total');
  for (const event of report.eventBreakdown) {
    lines.push(`${escapeCSV(event.eventName)},€${event.total.toFixed(2)}`);
  }
  lines.push('');
  
  // Payment breakdown
  lines.push('FORMAS DE PAGAMENTO');
  lines.push('Método,Total');
  for (const payment of report.paymentBreakdown) {
    const methodName = translatePaymentMethod(payment.method);
    lines.push(`${methodName},€${payment.total.toFixed(2)}`);
  }
  
  return lines.join('\n');
}
