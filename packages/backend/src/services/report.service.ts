import { EventReport, StockReport, ReportFilter, PaymentMethod, CategoryReport } from '@cantina-pos/shared';
import * as reportRepository from '../repositories/report.repository';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';

export async function getEventReport(eventId: string, filter?: ReportFilter): Promise<EventReport> {
  const event = await eventRepository.getEventById(eventId);
  if (!event) throw new Error('ERR_EVENT_NOT_FOUND');
  return reportRepository.aggregateEventReport(eventId, filter);
}

export async function getReportByPeriod(startDate: string, endDate: string): Promise<EventReport> {
  const events = await eventRepository.getEvents();
  let totalSales = 0, totalPaid = 0, totalPending = 0, totalRefunded = 0;
  const itemsMap = new Map<string, { description: string; quantity: number; total: number }>();
  const paymentMap = new Map<PaymentMethod, number>();

  for (const event of events) {
    const report = await reportRepository.aggregateEventReport(event.id, { startDate, endDate });
    totalSales += report.totalSales;
    totalPaid += report.totalPaid;
    totalPending += report.totalPending;
    totalRefunded += report.totalRefunded;

    for (const item of report.itemsSold) {
      const existing = itemsMap.get(item.description);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.total;
      } else {
        itemsMap.set(item.description, { ...item });
      }
    }

    for (const payment of report.paymentBreakdown) {
      paymentMap.set(payment.method, (paymentMap.get(payment.method) || 0) + payment.total);
    }
  }

  return {
    eventId: 'all',
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    itemsSold: Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity),
    paymentBreakdown: Array.from(paymentMap.entries()).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
  };
}

export async function getCategoryReport(categoryId: string): Promise<CategoryReport> {
  const category = await eventCategoryRepository.getCategoryById(categoryId);
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');
  return reportRepository.aggregateCategoryReport(categoryId);
}

export async function getStockReport(eventId: string): Promise<StockReport> {
  const event = await eventRepository.getEventById(eventId);
  if (!event) throw new Error('ERR_EVENT_NOT_FOUND');
  return reportRepository.generateStockReport(eventId);
}

function escapeCSV(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function translatePaymentMethod(method: PaymentMethod): string {
  const translations: Record<PaymentMethod, string> = { cash: 'Dinheiro', card: 'Cartão', transfer: 'Transferência', balance: 'Saldo', credit: 'Fiado' };
  return translations[method] || method;
}

export async function exportReportCSV(eventId: string): Promise<string> {
  const report = await getEventReport(eventId);
  const stockReport = await getStockReport(eventId);
  const event = await eventRepository.getEventById(eventId);

  const lines: string[] = [
    `Relatório de Vendas - ${event?.name || eventId}`,
    `Gerado em: ${new Date().toISOString()}`,
    '',
    'RESUMO',
    `Total de Vendas,€${report.totalSales.toFixed(2)}`,
    `Total Pago,€${report.totalPaid.toFixed(2)}`,
    `Total Pendente,€${report.totalPending.toFixed(2)}`,
    `Total Estornado,€${report.totalRefunded.toFixed(2)}`,
    '',
    'ITENS VENDIDOS',
    'Descrição,Quantidade,Total',
    ...report.itemsSold.map(item => `${escapeCSV(item.description)},${item.quantity},€${item.total.toFixed(2)}`),
    '',
    'FORMAS DE PAGAMENTO',
    'Método,Total',
    ...report.paymentBreakdown.map(p => `${translatePaymentMethod(p.method)},€${p.total.toFixed(2)}`),
    '',
    'RELATÓRIO DE ESTOQUE',
    'Descrição,Estoque Inicial,Vendido,Disponível,Infinito',
    ...stockReport.items.map(item => 
      `${escapeCSV(item.description)},${item.isInfinite ? 'N/A' : item.initialStock},${item.sold},${item.isInfinite ? 'N/A' : item.available},${item.isInfinite ? 'Sim' : 'Não'}`
    ),
  ];
  return lines.join('\n');
}

export async function exportCategoryReportCSV(categoryId: string): Promise<string> {
  const report = await getCategoryReport(categoryId);

  const lines: string[] = [
    `Relatório de Categoria - ${report.categoryName}`,
    `Gerado em: ${new Date().toISOString()}`,
    `Total de Eventos: ${report.eventCount}`,
    '',
    'RESUMO',
    `Total de Vendas,€${report.totalSales.toFixed(2)}`,
    `Total Pago,€${report.totalPaid.toFixed(2)}`,
    `Total Pendente,€${report.totalPending.toFixed(2)}`,
    `Total Estornado,€${report.totalRefunded.toFixed(2)}`,
    '',
    'EVENTOS',
    'Nome do Evento,Total',
    ...report.eventBreakdown.map(e => `${escapeCSV(e.eventName)},€${e.total.toFixed(2)}`),
    '',
    'FORMAS DE PAGAMENTO',
    'Método,Total',
    ...report.paymentBreakdown.map(p => `${translatePaymentMethod(p.method)},€${p.total.toFixed(2)}`),
  ];
  return lines.join('\n');
}
