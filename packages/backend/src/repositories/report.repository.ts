import { Sale, MenuItem, PaymentMethod, Event } from '@cantina-pos/shared';
import { EventReport, StockReport, ItemSoldSummary, PaymentBreakdown, StockReportItem, ReportFilter, CategoryReport, EventBreakdownItem } from '@cantina-pos/shared';
import * as saleRepository from './sale.repository';
import * as menuItemRepository from './menu-item.repository';
import * as eventRepository from './event.repository';
import * as eventCategoryRepository from './event-category.repository';

/**
 * Aggregate sales data for an event report
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * @param eventId - Event ID
 * @param filter - Optional filter (category, period)
 * @returns EventReport
 */
export function aggregateEventReport(eventId: string, filter?: ReportFilter): EventReport {
  let sales = saleRepository.getSalesByEvent(eventId);
  
  // Validate and apply category filter (Requirements: 10.2)
  if (filter?.category) {
    const event = eventRepository.getEventById(eventId);
    if (event && !event.categories.includes(filter.category)) {
      throw new Error('ERR_INVALID_CATEGORY');
    }
    // Note: Category filtering groups sales by event category
    // Since all sales in an event belong to that event's categories,
    // we validate the category exists but don't filter individual sales
  }
  
  // Apply date filter if provided (Requirements: 10.4)
  if (filter?.startDate || filter?.endDate) {
    sales = filterSalesByPeriod(sales, filter.startDate, filter.endDate);
  }
  
  // Calculate totals
  let totalSales = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalRefunded = 0;
  
  const itemsMap = new Map<string, ItemSoldSummary>();
  const paymentMap = new Map<PaymentMethod, number>();
  
  for (const sale of sales) {
    if (sale.isRefunded) {
      totalRefunded += sale.total;
      continue;
    }
    
    totalSales += sale.total;
    
    if (sale.isPaid) {
      totalPaid += sale.total;
    } else {
      totalPending += sale.total;
    }
    
    // Aggregate items sold
    for (const item of sale.items) {
      const existing = itemsMap.get(item.description);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.price * item.quantity;
      } else {
        itemsMap.set(item.description, {
          description: item.description,
          quantity: item.quantity,
          total: item.price * item.quantity,
        });
      }
    }
    
    // Aggregate payment methods (only for non-refunded sales)
    for (const payment of sale.payments) {
      const current = paymentMap.get(payment.method) || 0;
      paymentMap.set(payment.method, current + payment.amount);
    }
  }
  
  const itemsSold: ItemSoldSummary[] = Array.from(itemsMap.values())
    .sort((a, b) => b.quantity - a.quantity);
  
  const paymentBreakdown: PaymentBreakdown[] = Array.from(paymentMap.entries())
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total);
  
  return {
    eventId,
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    itemsSold,
    paymentBreakdown,
  };
}

/**
 * Filter sales by period
 * Requirements: 10.4
 * @param sales - Array of sales
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Filtered sales
 * @throws Error if dates are invalid or range is invalid
 */
function filterSalesByPeriod(sales: Sale[], startDate?: string, endDate?: string): Sale[] {
  // Validate date formats
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new Error('ERR_INVALID_DATE_FORMAT');
    }
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      throw new Error('ERR_INVALID_DATE_FORMAT');
    }
  }
  
  // Validate date range
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new Error('ERR_INVALID_DATE_RANGE');
  }
  
  return sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    
    if (startDate && saleDate < new Date(startDate)) {
      return false;
    }
    
    if (endDate && saleDate > new Date(endDate)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Generate stock report for an event
 * Requirements: 10.5
 * @param eventId - Event ID
 * @returns StockReport
 */
export function generateStockReport(eventId: string): StockReport {
  const menuItems = menuItemRepository.getMenuItemsByEvent(eventId);
  
  const items: StockReportItem[] = menuItems.map(item => {
    const isInfinite = item.stock === 0;
    
    return {
      description: item.description,
      initialStock: isInfinite ? 0 : item.stock,
      sold: item.soldCount,
      available: isInfinite ? Infinity : Math.max(0, item.stock - item.soldCount),
      isInfinite,
    };
  });
  
  return {
    eventId,
    items,
  };
}

/**
 * Aggregate report data for all events in a category
 * Requirements: 11.2
 * @param categoryId - Category ID
 * @returns CategoryReport with aggregated data from all events
 * @throws Error if category not found
 */
export function aggregateCategoryReport(categoryId: string): CategoryReport {
  const category = eventCategoryRepository.getCategoryByIdSync(categoryId);
  
  if (!category) {
    throw new Error('ERR_CATEGORY_NOT_FOUND');
  }
  
  const events = eventRepository.getEventsByCategory(categoryId);
  
  let totalSales = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalRefunded = 0;
  
  const eventBreakdown: EventBreakdownItem[] = [];
  const paymentMap = new Map<PaymentMethod, number>();
  
  for (const event of events) {
    const eventReport = aggregateEventReport(event.id);
    
    totalSales += eventReport.totalSales;
    totalPaid += eventReport.totalPaid;
    totalPending += eventReport.totalPending;
    totalRefunded += eventReport.totalRefunded;
    
    // Add event to breakdown
    eventBreakdown.push({
      eventId: event.id,
      eventName: event.name,
      total: eventReport.totalSales,
    });
    
    // Merge payment breakdown
    for (const payment of eventReport.paymentBreakdown) {
      const current = paymentMap.get(payment.method) || 0;
      paymentMap.set(payment.method, current + payment.total);
    }
  }
  
  const paymentBreakdown: PaymentBreakdown[] = Array.from(paymentMap.entries())
    .map(([method, total]) => ({ method, total }))
    .sort((a, b) => b.total - a.total);
  
  return {
    categoryId,
    categoryName: category.name,
    eventCount: events.length,
    totalSales,
    totalPaid,
    totalPending,
    totalRefunded,
    eventBreakdown: eventBreakdown.sort((a, b) => b.total - a.total),
    paymentBreakdown,
  };
}
