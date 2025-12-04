import { AppState, AppAction, initialState } from './types';

// Calculate order total from items
function calculateOrderTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Auth
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        userId: action.payload.userId,
      };

    // Connection
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    case 'SET_PENDING_OPERATIONS':
      return { ...state, pendingOperationsCount: action.payload };

    // Events
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'SET_CURRENT_EVENT':
      return { ...state, currentEvent: action.payload };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(e => (e.id === action.payload.id ? action.payload : e)),
        currentEvent: state.currentEvent?.id === action.payload.id ? action.payload : state.currentEvent,
      };
    case 'SET_EVENTS_LOADING':
      return { ...state, eventsLoading: action.payload };

    // Menu Groups
    case 'SET_MENU_GROUPS':
      return { ...state, menuGroups: action.payload };
    case 'ADD_MENU_GROUP':
      return { ...state, menuGroups: [...state.menuGroups, action.payload] };
    case 'REMOVE_MENU_GROUP':
      return { ...state, menuGroups: state.menuGroups.filter(g => g.id !== action.payload) };

    // Catalog Items
    case 'SET_CATALOG_ITEMS':
      return { ...state, catalogItems: action.payload };
    case 'ADD_CATALOG_ITEM':
      return { ...state, catalogItems: [...state.catalogItems, action.payload] };
    case 'UPDATE_CATALOG_ITEM':
      return {
        ...state,
        catalogItems: state.catalogItems.map(i => (i.id === action.payload.id ? action.payload : i)),
      };
    case 'REMOVE_CATALOG_ITEM':
      return { ...state, catalogItems: state.catalogItems.filter(i => i.id !== action.payload) };

    // Menu Items
    case 'SET_MENU_ITEMS':
      return { ...state, menuItems: action.payload };
    case 'ADD_MENU_ITEM':
      return { ...state, menuItems: [...state.menuItems, action.payload] };
    case 'UPDATE_MENU_ITEM':
      return {
        ...state,
        menuItems: state.menuItems.map(i => (i.id === action.payload.id ? action.payload : i)),
      };
    case 'REMOVE_MENU_ITEM':
      return { ...state, menuItems: state.menuItems.filter(i => i.id !== action.payload) };
    case 'SET_MENU_LOADING':
      return { ...state, menuLoading: action.payload };

    // Order
    case 'SET_CURRENT_ORDER':
      return { ...state, currentOrder: action.payload };
    case 'ADD_ORDER_ITEM': {
      const existingIndex = state.orderItems.findIndex(
        i => i.menuItemId === action.payload.menuItemId
      );
      let newItems;
      if (existingIndex >= 0) {
        newItems = state.orderItems.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newItems = [...state.orderItems, action.payload];
      }
      return {
        ...state,
        orderItems: newItems,
        orderTotal: calculateOrderTotal(newItems),
      };
    }
    case 'UPDATE_ORDER_ITEM': {
      const newItems = state.orderItems.map(item =>
        item.menuItemId === action.payload.menuItemId
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      return {
        ...state,
        orderItems: newItems,
        orderTotal: calculateOrderTotal(newItems),
      };
    }
    case 'REMOVE_ORDER_ITEM': {
      const newItems = state.orderItems.filter(i => i.menuItemId !== action.payload);
      return {
        ...state,
        orderItems: newItems,
        orderTotal: calculateOrderTotal(newItems),
      };
    }
    case 'CLEAR_ORDER':
      return {
        ...state,
        currentOrder: null,
        orderItems: [],
        orderTotal: 0,
      };

    // Sales
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'UPDATE_SALE':
      return {
        ...state,
        sales: state.sales.map(s => (s.id === action.payload.id ? action.payload : s)),
      };
    case 'SET_SALES_LOADING':
      return { ...state, salesLoading: action.payload };

    // Customers
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'SET_CURRENT_CUSTOMER':
      return { ...state, currentCustomer: action.payload };
    case 'SET_CUSTOMER_BALANCE':
      return { ...state, customerBalance: action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'SET_CUSTOMERS_LOADING':
      return { ...state, customersLoading: action.payload };

    // UI
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, error: null, successMessage: null };

    default:
      return state;
  }
}
