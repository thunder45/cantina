// Frontend Web entry point for Cantina ADVM
export { App } from './App';
export { EventsPage, MenuPage } from './pages';
export { EventList, EventForm } from './components/events';
export { MenuGroupList, MenuItemCard } from './components/menu';
export { CatalogBrowser, AddMenuItemForm, CreateCatalogItemForm } from './components/catalog';

// Hooks for platform detection and responsive design
export { usePlatform, useKeyboardShortcuts } from './hooks';
export type { PlatformInfo, KeyboardShortcut } from './hooks';

// Responsive styles
export * from './styles';
