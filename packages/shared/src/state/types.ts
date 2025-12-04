import {
  Event,
  MenuGroup,
  CatalogItem,
  MenuItem,
  Order,
  Sale,
  Customer,
  OrderItem,
} from '../types';

// Application State
export interface AppState {
  // Auth
  isAuthenticated: boolean;
  userId: string | null;

  // Connection
  isOnline: boolean;
  pendingOperationsCount: number;

  // Events
  events: Event[];
  currentEvent: Event | null;
  eventsLoading: boolean;

  // Menu
  menuGroups: MenuGroup[];
  catalogItems: CatalogItem[];
  menuItems: MenuItem[];
  menuLoading: boolean;

  // Current Order
  currentOrder: Order | null;
  orderItems: OrderItem[];
  orderTotal: number;

  // Sales
  sales: Sale[];
  salesLoading: boolean;

  // Customers
  customers: Customer[];
  currentCustomer: Customer | null;
  customerBalance: number;
  customersLoading: boolean;

  // UI State
  error: string | null;
  successMessage: string | null;
}

// Action Types
export type AppAction =
  // Auth
  | { type: 'SET_AUTHENTICATED'; payload: { isAuthenticated: boolean; userId: string | null } }
  
  // Connection
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_PENDING_OPERATIONS'; payload: number }
  
  // Events
  | { type: 'SET_EVENTS'; payload: Event[] }
  | { type: 'SET_CURRENT_EVENT'; payload: Event | null }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'SET_EVENTS_LOADING'; payload: boolean }
  
  // Menu
  | { type: 'SET_MENU_GROUPS'; payload: MenuGroup[] }
  | { type: 'ADD_MENU_GROUP'; payload: MenuGroup }
  | { type: 'REMOVE_MENU_GROUP'; payload: string }
  | { type: 'SET_CATALOG_ITEMS'; payload: CatalogItem[] }
  | { type: 'ADD_CATALOG_ITEM'; payload: CatalogItem }
  | { type: 'UPDATE_CATALOG_ITEM'; payload: CatalogItem }
  | { type: 'REMOVE_CATALOG_ITEM'; payload: string }
  | { type: 'SET_MENU_ITEMS'; payload: MenuItem[] }
  | { type: 'ADD_MENU_ITEM'; payload: MenuItem }
  | { type: 'UPDATE_MENU_ITEM'; payload: MenuItem }
  | { type: 'REMOVE_MENU_ITEM'; payload: string }
  | { type: 'SET_MENU_LOADING'; payload: boolean }
  
  // Order
  | { type: 'SET_CURRENT_ORDER'; payload: Order | null }
  | { type: 'ADD_ORDER_ITEM'; payload: OrderItem }
  | { type: 'UPDATE_ORDER_ITEM'; payload: { menuItemId: string; quantity: number } }
  | { type: 'REMOVE_ORDER_ITEM'; payload: string }
  | { type: 'CLEAR_ORDER' }
  
  // Sales
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: Sale }
  | { type: 'SET_SALES_LOADING'; payload: boolean }
  
  // Customers
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'SET_CURRENT_CUSTOMER'; payload: Customer | null }
  | { type: 'SET_CUSTOMER_BALANCE'; payload: number }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'SET_CUSTOMERS_LOADING'; payload: boolean }
  
  // UI
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' };

// Initial State
export const initialState: AppState = {
  isAuthenticated: false,
  userId: null,
  isOnline: true,
  pendingOperationsCount: 0,
  events: [],
  currentEvent: null,
  eventsLoading: false,
  menuGroups: [],
  catalogItems: [],
  menuItems: [],
  menuLoading: false,
  currentOrder: null,
  orderItems: [],
  orderTotal: 0,
  sales: [],
  salesLoading: false,
  customers: [],
  currentCustomer: null,
  customerBalance: 0,
  customersLoading: false,
  error: null,
  successMessage: null,
};
