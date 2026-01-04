import { ApiClient } from './client';
import {
  Event,
  EventCategory,
  CreateEventCategoryInput,
  UpdateEventCategoryInput,
  MenuGroup,
  CatalogItem,
  MenuItem,
  Order,
  Sale,
  Customer,
  CustomerPayment,
  CustomerTransaction,
  CustomerHistory,
  CustomerWithBalance,
  PaymentPart,
  PaymentMethod,
  Receipt,
  EventReport,
  StockReport,
  CategoryReport,
  GlobalReport,
  GlobalReportFilter,
} from '../types';

// Event Category API Service
export class EventCategoryApiService {
  constructor(private client: ApiClient) {}

  async getCategories(): Promise<EventCategory[]> {
    return this.client.get('/categories');
  }

  async getCategory(id: string): Promise<EventCategory> {
    return this.client.get(`/categories/${id}`);
  }

  async createCategory(input: CreateEventCategoryInput): Promise<EventCategory> {
    return this.client.post('/categories', input);
  }

  async updateCategory(id: string, input: UpdateEventCategoryInput): Promise<EventCategory> {
    return this.client.put(`/categories/${id}`, input);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.client.delete(`/categories/${id}`);
  }

  async getCategoryEvents(categoryId: string): Promise<Event[]> {
    return this.client.get(`/categories/${categoryId}/events`);
  }

  async getCategoryEventCount(categoryId: string): Promise<number> {
    const events = await this.getCategoryEvents(categoryId);
    return events.length;
  }
}

// Event API Service
export class EventApiService {
  constructor(private client: ApiClient) {}

  async createEvent(categoryId: string, name: string, dates: string[]): Promise<Event> {
    return this.client.post('/events', { categoryId, name, dates });
  }

  async getEvents(): Promise<Event[]> {
    return this.client.get('/events');
  }

  async getEvent(id: string): Promise<Event> {
    return this.client.get(`/events/${id}`);
  }

  async updateEventStatus(id: string, status: 'active' | 'closed'): Promise<Event> {
    return this.client.patch(`/events/${id}/status`, { status });
  }
}

// Menu Group API Service
export class MenuGroupApiService {
  constructor(private client: ApiClient) {}

  async getGroups(): Promise<MenuGroup[]> {
    return this.client.get('/groups');
  }

  async createGroup(name: string): Promise<MenuGroup> {
    return this.client.post('/groups', { name });
  }

  async deleteGroup(id: string): Promise<void> {
    return this.client.delete(`/groups/${id}`);
  }
}

// Catalog API Service
export class CatalogApiService {
  constructor(private client: ApiClient) {}

  async getCatalogItems(groupId?: string): Promise<CatalogItem[]> {
    const query = groupId ? `?groupId=${groupId}` : '';
    return this.client.get(`/catalog${query}`);
  }

  async searchCatalogItems(query: string): Promise<CatalogItem[]> {
    return this.client.get(`/catalog/search?q=${encodeURIComponent(query)}`);
  }

  async createCatalogItem(item: Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'version'>): Promise<CatalogItem> {
    return this.client.post('/catalog', item);
  }

  async updateCatalogItem(id: string, updates: Partial<CatalogItem>): Promise<CatalogItem> {
    return this.client.put(`/catalog/${id}`, updates);
  }

  async deleteCatalogItem(id: string): Promise<void> {
    return this.client.delete(`/catalog/${id}`);
  }
}

// Menu Item API Service
export class MenuItemApiService {
  constructor(private client: ApiClient) {}

  async getMenuItems(eventId: string): Promise<MenuItem[]> {
    return this.client.get(`/events/${eventId}/menu`);
  }

  async addMenuItem(eventId: string, item: Omit<MenuItem, 'id' | 'soldCount'>): Promise<MenuItem> {
    return this.client.post(`/events/${eventId}/menu`, item);
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    return this.client.put(`/menu/${id}`, updates);
  }

  async removeMenuItem(id: string): Promise<void> {
    return this.client.delete(`/menu/${id}`);
  }
}

// Order API Service
export class OrderApiService {
  constructor(private client: ApiClient) {}

  async createOrder(eventId: string): Promise<Order> {
    return this.client.post('/orders', { eventId });
  }

  async getOrder(orderId: string): Promise<Order> {
    return this.client.get(`/orders/${orderId}`);
  }

  // Add or update a single item in the order (matches backend API)
  async addOrUpdateOrderItem(
    orderId: string,
    menuItemId: string,
    quantity: number
  ): Promise<Order> {
    return this.client.put(`/orders/${orderId}/items`, { menuItemId, quantity });
  }

  // Remove a single item from the order
  async removeOrderItem(orderId: string, menuItemId: string): Promise<Order> {
    return this.client.delete(`/orders/${orderId}/items/${menuItemId}`);
  }

  async cancelOrder(orderId: string): Promise<void> {
    return this.client.delete(`/orders/${orderId}`);
  }
}

// Sales API Service
export class SalesApiService {
  constructor(private client: ApiClient) {}

  async confirmSale(
    orderId: string,
    payments: PaymentPart[],
    customerId?: string
  ): Promise<Sale> {
    return this.client.post('/sales', { orderId, payments, customerId });
  }

  async getSales(eventId: string): Promise<Sale[]> {
    return this.client.get(`/events/${eventId}/sales`);
  }

  async getReceipt(saleId: string): Promise<Receipt> {
    return this.client.get(`/sales/${saleId}/receipt`);
  }

  async refundSale(saleId: string, reason: string): Promise<void> {
    return this.client.post(`/sales/${saleId}/refund`, { reason });
  }
}

// Customer API Service
export class CustomerApiService {
  constructor(private client: ApiClient) {}

  async searchCustomers(query: string): Promise<CustomerWithBalance[]> {
    return this.client.get(`/customers/search?q=${encodeURIComponent(query)}`);
  }

  async getAllCustomers(): Promise<CustomerWithBalance[]> {
    return this.client.get('/customers');
  }

  async createCustomer(name: string, creditLimit?: number, initialBalance?: number): Promise<Customer> {
    return this.client.post('/customers', { name, creditLimit, initialBalance });
  }

  async getCustomer(id: string): Promise<CustomerWithBalance> {
    return this.client.get(`/customers/${id}`);
  }

  async getCustomerBalance(customerId: string): Promise<number> {
    const result = await this.client.get<{ balance: number }>(`/customers/${customerId}/balance`);
    return result.balance;
  }

  async getCustomerHistory(customerId: string, filter?: { categoryId?: string; startDate?: string; endDate?: string }): Promise<CustomerHistory> {
    const params = new URLSearchParams();
    if (filter?.categoryId) params.append('categoryId', filter.categoryId);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.client.get(`/customers/${customerId}/history${query}`);
  }

  async deposit(customerId: string, amount: number, paymentMethod: PaymentMethod): Promise<CustomerTransaction> {
    return this.client.post(`/customers/${customerId}/deposit`, { amount, paymentMethod });
  }

  async withdraw(customerId: string, amount: number, paymentMethod: PaymentMethod): Promise<CustomerTransaction> {
    return this.client.post(`/customers/${customerId}/withdraw`, { amount, paymentMethod });
  }

  async updateCreditLimit(customerId: string, creditLimit: number): Promise<Customer> {
    return this.client.patch(`/customers/${customerId}/credit-limit`, { creditLimit });
  }

  async updateCustomer(customerId: string, updates: { name?: string; initialBalance?: number }): Promise<Customer> {
    return this.client.patch(`/customers/${customerId}`, updates);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.client.delete(`/customers/${customerId}`);
  }

  // Legacy - keep for compatibility
  async registerPayment(customerId: string, payments: PaymentPart[]): Promise<CustomerPayment> {
    return this.client.post(`/customers/${customerId}/payments`, { payments });
  }
}

// Report API Service
export class ReportApiService {
  constructor(private client: ApiClient) {}

  async getGlobalReport(filter?: GlobalReportFilter): Promise<GlobalReport> {
    const params = new URLSearchParams();
    if (filter?.categoryId) params.append('categoryId', filter.categoryId);
    if (filter?.eventId) params.append('eventId', filter.eventId);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    if (filter?.paymentMethod) params.append('paymentMethod', filter.paymentMethod);
    if (filter?.customerId) params.append('customerId', filter.customerId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.client.get(`/reports/global${query}`);
  }

  async getEventReport(
    eventId: string,
    filter?: { category?: string; startDate?: string; endDate?: string }
  ): Promise<EventReport> {
    const params = new URLSearchParams();
    if (filter?.category) params.append('category', filter.category);
    if (filter?.startDate) params.append('startDate', filter.startDate);
    if (filter?.endDate) params.append('endDate', filter.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.client.get(`/events/${eventId}/report${query}`);
  }

  async getCategoryReport(categoryId: string): Promise<CategoryReport> {
    return this.client.get(`/categories/${categoryId}/report`);
  }

  async getStockReport(eventId: string): Promise<StockReport> {
    return this.client.get(`/events/${eventId}/stock-report`);
  }

  async exportReportCSV(eventId: string): Promise<string> {
    return this.client.get(`/events/${eventId}/report/export`);
  }

  async exportCategoryReportCSV(categoryId: string): Promise<string> {
    return this.client.get(`/categories/${categoryId}/report/export`);
  }
}
