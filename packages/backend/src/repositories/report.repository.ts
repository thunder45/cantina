import { Sale, PaymentMethod } from '@cantina-pos/shared';
import { EventReport, StockReport, ItemSoldSummary, PaymentBreakdown, StockReportItem, ReportFilter, CategoryReport, EventBreakdownItem, SaleDetail } from '@cantina-pos/shared';
import * as saleRepository from './sale.repository';
import * as menuItemRepository from './menu-item.repository';
import * as eventRepository from './event.repository';
import * as eventCategoryRepository from './event-category.repository';
import * as customerRepository from './customer.repository';

export async function aggregateEventReport(eventId: string, filter?: ReportFilter): Promise<EventReport> {
  let sales = await saleRepository.getSalesByEvent(eventId);

  if (filter?.category) {
    const event = await eventRepository.getEventById(eventId);
    if (event && !event.categories.includes(filter.category)) {
      throw new Error('ERR_INVALID_CATEGORY');
    }
  }

  if (filter?.startDate || filter?.endDate) {
    sales = filterSalesByPeriod(sales, filter.startDate, filter.endDate);
  }

  let totalSales = 0, totalPaid = 0, totalGifted = 0, totalPending = 0, totalRefunded = 0;
  const itemsMap = new Map<string, ItemSoldSummary>();
  const paymentMap = new Map<PaymentMethod, number>();
  const saleDetails: SaleDetail[] = [];

  for (const sale of sales) {
    // Build sale detail
    let customerName: string | undefined;
    if (sale.customerId) {
      try {
        const customer = await customerRepository.getCustomerById(sale.customerId);
        customerName = customer?.name;
      } catch { /* ignore */ }
    }
    saleDetails.push({
      id: sale.id,
      createdAt: sale.createdAt,
      total: sale.total,
      payments: sale.payments.map(p => ({ method: p.method, amount: p.amount })),
      items: sale.items.map(i => ({ description: i.description, quantity: i.quantity, price: i.price })),
      customerName,
      createdBy: sale.createdBy,
      refunded: sale.isRefunded,
      isPaid: sale.isPaid,
    });

    if (sale.isRefunded) {
      totalRefunded += sale.total;
      continue;
    }
    totalSales += sale.total;
    const giftAmount = sale.payments.filter(p => p.method === 'gift').reduce((s, p) => s + p.amount, 0);
    totalGifted += giftAmount;
    if (sale.isPaid) {
      totalPaid += sale.total;
    } else {
      const creditAmount = sale.payments.filter(p => p.method === 'credit').reduce((s, p) => s + p.amount, 0);
      totalPending += creditAmount;
      totalPaid += sale.total - creditAmount;
    }

    for (const item of sale.items) {
      const existing = itemsMap.get(item.description);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
      } else {
        itemsMap.set(item.description, { description: item.description, quantity: item.quantity, total: item.price * item.quantity });
      }
    }

    for (const payment of sale.payments) {
      paymentMap.set(payment.method, (paymentMap.get(payment.method) || 0) + payment.amount);
    }
  }

  return {
    eventId,
    totalSales,
    totalPaid,
    totalGifted,
    totalPending,
    totalRefunded,
    itemsSold: Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity),
    paymentBreakdown: Array.from(paymentMap.entries()).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
    sales: saleDetails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

function filterSalesByPeriod(sales: Sale[], startDate?: string, endDate?: string): Sale[] {
  if (startDate && isNaN(new Date(startDate).getTime())) throw new Error('ERR_INVALID_DATE_FORMAT');
  if (endDate && isNaN(new Date(endDate).getTime())) throw new Error('ERR_INVALID_DATE_FORMAT');
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new Error('ERR_INVALID_DATE_RANGE');

  // Make endDate inclusive (end of day)
  const endDateTime = endDate ? new Date(endDate + 'T23:59:59.999Z') : undefined;

  return sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    if (startDate && saleDate < new Date(startDate)) return false;
    if (endDateTime && saleDate > endDateTime) return false;
    return true;
  });
}

export async function generateStockReport(eventId: string): Promise<StockReport> {
  const menuItems = await menuItemRepository.getMenuItemsByEvent(eventId);
  const items: StockReportItem[] = menuItems.map(item => ({
    description: item.description,
    initialStock: item.stock === 0 ? 0 : item.stock,
    sold: item.soldCount,
    available: item.stock === 0 ? Infinity : Math.max(0, item.stock - item.soldCount),
    isInfinite: item.stock === 0,
  }));
  return { eventId, items };
}

export async function aggregateCategoryReport(categoryId: string): Promise<CategoryReport> {
  const category = await eventCategoryRepository.getCategoryById(categoryId);
  if (!category) throw new Error('ERR_CATEGORY_NOT_FOUND');

  const events = await eventRepository.getEventsByCategory(categoryId);
  let totalSales = 0, totalPaid = 0, totalPending = 0, totalRefunded = 0;
  const eventBreakdown: EventBreakdownItem[] = [];
  const paymentMap = new Map<PaymentMethod, number>();

  for (const event of events) {
    const eventReport = await aggregateEventReport(event.id);
    totalSales += eventReport.totalSales;
    totalPaid += eventReport.totalPaid;
    totalPending += eventReport.totalPending;
    totalRefunded += eventReport.totalRefunded;

    eventBreakdown.push({ eventId: event.id, eventName: event.name, total: eventReport.totalSales });

    for (const payment of eventReport.paymentBreakdown) {
      paymentMap.set(payment.method, (paymentMap.get(payment.method) || 0) + payment.total);
    }
  }

  return {
    categoryId,
    categoryName: category.name,
    eventCount: events.length,
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    eventBreakdown: eventBreakdown.sort((a, b) => b.total - a.total),
    paymentBreakdown: Array.from(paymentMap.entries()).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total),
  };
}
