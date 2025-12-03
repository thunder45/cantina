// Backend entry point for Cantina POS
// Export repositories as namespaces to avoid naming conflicts
export * as menuGroupRepository from './repositories/menu-group.repository';
export * as catalogItemRepository from './repositories/catalog-item.repository';

// Export services as namespaces
export * as menuGroupService from './services/menu-group.service';
export * as catalogItemService from './services/catalog-item.service';
