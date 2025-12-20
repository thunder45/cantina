import { EventReport, StockReport, ReportFilter, PaymentMethod, CategoryReport, GlobalReport, GlobalReportFilter, GlobalSaleDetail, CategoryBreakdownItem } from '@cantina-pos/shared';
import * as reportRepository from '../repositories/report.repository';
import * as eventRepository from '../repositories/event.repository';
import * as eventCategoryRepository from '../repositories/event-category.repository';
import * as customerRepository from '../repositories/customer.repository';

export async function getEventReport(eventId: string, filter?: ReportFilter): Promise<EventReport> {
  const event = await eventRepository.getEventById(eventId);
  if (!event) throw new Error('ERR_EVENT_NOT_FOUND');
  return reportRepository.aggregateEventReport(eventId, filter);
}

export async function getGlobalReport(filter?: GlobalReportFilter): Promise<GlobalReport> {
  const events = await eventRepository.getEvents();
  const categories = await eventCategoryRepository.getCategories();
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  
  let totalSales = 0, totalPaid = 0, totalPending = 0, totalRefunded = 0;
  const itemsMap = new Map<string, { description: string; quantity: number; total: number }>();
  const paymentMap = new Map<PaymentMethod, number>();
  const categoryStatsMap = new Map<string, CategoryBreakdownItem>();
  const allSales: GlobalSaleDetail[] = [];

  // Filter events by category or eventId
  let filteredEvents = events;
  if (filter?.eventId) {
    filteredEvents = events.filter(e => e.id === filter.eventId);
  } else if (filter?.categoryId) {
    filteredEvents = events.filter(e => e.categoryId === filter.categoryId);
  }

  for (const event of filteredEvents) {
    const report = await reportRepository.aggregateEventReport(event.id, {
      startDate: filter?.startDate,
      endDate: filter?.endDate,
    });
    
    // Filter by payment method if specified
    let salesForEvent = report.sales;
    if (filter?.paymentMethod) {
      salesForEvent = salesForEvent.filter(s => 
        s.payments.some(p => p.method === filter.paymentMethod)
      );
    }
    
    // Filter by customer if specified
    if (filter?.customerId) {
      const customer = await customerRepository.getCustomerById(filter.customerId);
      if (customer) {
        salesForEvent = salesForEvent.filter(s => s.customerName === customer.name);
      }
    }

    // Recalculate totals based on filtered sales
    for (const sale of salesForEvent) {
      if (sale.refunded) {
        totalRefunded += sale.total;
      } else {
        totalSales += sale.total;
        const creditAmount = sale.payments.filter(p => p.method === 'credit').reduce((s, p) => s + p.amount, 0);
        totalPending += creditAmount;
        totalPaid += sale.total - creditAmount;
      }
      
      // Payment breakdown
      for (const payment of sale.payments) {
        if (!sale.refunded) {
          paymentMap.set(payment.method, (paymentMap.get(payment.method) || 0) + payment.amount);
        }
      }
      
      // Items sold
      for (const item of sale.items) {
        if (!sale.refunded) {
          const key = item.description;
          const existing = itemsMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += item.quantity * item.price;
          } else {
            itemsMap.set(key, { description: item.description, quantity: item.quantity, total: item.quantity * item.price });
          }
        }
      }
      
      // Add to sales list with event info
      allSales.push({
        ...sale,
        eventId: event.id,
        eventName: event.name,
        categoryId: event.categoryId,
        categoryName: categoryMap.get(event.categoryId) || '',
      });
    }
    
    // Category breakdown
    const catStats = categoryStatsMap.get(event.categoryId) || {
      categoryId: event.categoryId,
      categoryName: categoryMap.get(event.categoryId) || '',
      total: 0,
      paid: 0,
      pending: 0,
    };
    for (const sale of salesForEvent) {
      if (!sale.refunded) {
        catStats.total += sale.total;
        const creditAmount = sale.payments.filter(p => p.method === 'credit').reduce((s, p) => s + p.amount, 0);
        catStats.pending += creditAmount;
        catStats.paid += sale.total - creditAmount;
      }
    }
    categoryStatsMap.set(event.categoryId, catStats);
  }

  return {
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    itemsSold: Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity),
    paymentBreakdown: Array.from(paymentMap.entries()).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
    categoryBreakdown: Array.from(categoryStatsMap.values()).sort((a, b) => b.total - a.total),
    sales: allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export async function getReportByPeriod(startDate: string, endDate: string): Promise<EventReport> {
  const events = await eventRepository.getEvents();
  let totalSales = 0, totalPaid = 0, totalPending = 0, totalRefunded = 0;
  const itemsMap = new Map<string, { description: string; quantity: number; total: number }>();
  const paymentMap = new Map<PaymentMethod, number>();
  const allSales: EventReport['sales'] = [];

  for (const event of events) {
    const report = await reportRepository.aggregateEventReport(event.id, { startDate, endDate });
    totalSales += report.totalSales;
    totalPaid += report.totalPaid;
    totalPending += report.totalPending;
    totalRefunded += report.totalRefunded;
    allSales.push(...report.sales);

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
    sales: allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
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
