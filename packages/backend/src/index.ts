// Backend entry point for Cantina POS

// Export API
export * from './api';

// Export repositories as namespaces to avoid naming conflicts
export * as menuGroupRepository from './repositories/menu-group.repository';
export * as catalogItemRepository from './repositories/catalog-item.repository';
export * as eventRepository from './repositories/event.repository';
export * as menuItemRepository from './repositories/menu-item.repository';
export * as orderRepository from './repositories/order.repository';
export * as saleRepository from './repositories/sale.repository';
export * as customerRepository from './repositories/customer.repository';
export * as reportRepository from './repositories/report.repository';

// Export services as namespaces
export * as menuGroupService from './services/menu-group.service';
export * as catalogItemService from './services/catalog-item.service';
export * as eventService from './services/event.service';
export * as menuItemService from './services/menu-item.service';
export * as orderService from './services/order.service';
export * as salesService from './services/sales.service';
export * as customerService from './services/customer.service';
export * as reportService from './services/report.service';
