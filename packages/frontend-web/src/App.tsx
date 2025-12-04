import React, { useState, useReducer } from 'react';
import { Event } from '@cantina-pos/shared';
import { ApiClient } from '@cantina-pos/shared';
import { appReducer, initialState } from '@cantina-pos/shared';
import { EventsPage, MenuPage, SalesPage } from './pages';

// Create API client instance
const apiClient = new ApiClient({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  getAuthToken: async () => {
    // TODO: Integrate with Cognito authentication
    return localStorage.getItem('authToken');
  },
  onUnauthorized: () => {
    // TODO: Redirect to login
    console.log('Unauthorized - redirect to login');
  },
});

type AppView = 'events' | 'menu' | 'sales' | 'customers' | 'reports';

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [currentView, setCurrentView] = useState<AppView>('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    dispatch({ type: 'SET_CURRENT_EVENT', payload: event });
    setCurrentView('menu');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'events':
        return (
          <EventsPage
            apiClient={apiClient}
            onEventSelect={handleEventSelect}
          />
        );
      case 'menu':
        return selectedEvent ? (
          <MenuPage
            apiClient={apiClient}
            event={selectedEvent}
            onStartSales={() => setCurrentView('sales')}
          />
        ) : null;
      case 'sales':
        return selectedEvent ? (
          <SalesPage
            apiClient={apiClient}
            event={selectedEvent}
            onBack={() => setCurrentView('menu')}
          />
        ) : null;
      case 'customers':
        return (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <h2>Customer Management</h2>
            <p>Em desenvolvimento...</p>
          </div>
        );
      case 'reports':
        return (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <h2>Reports</h2>
            <p>Em desenvolvimento...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navigation - only show when event is selected */}
      {selectedEvent && currentView !== 'events' && (
        <nav style={{
          display: 'flex',
          gap: 16,
          padding: '12px 20px',
          backgroundColor: '#1f2937',
          color: 'white',
        }}>
          <button
            onClick={() => setCurrentView('events')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 4,
              backgroundColor: 'transparent',
            }}
          >
            ← Eventos
          </button>
          <button
            onClick={() => setCurrentView('menu')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 4,
              backgroundColor: currentView === 'menu' ? '#374151' : 'transparent',
            }}
          >
            Menu
          </button>
          <button
            onClick={() => setCurrentView('sales')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 4,
              backgroundColor: currentView === 'sales' ? '#374151' : 'transparent',
            }}
          >
            Vendas
          </button>
          <button
            onClick={() => setCurrentView('customers')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 4,
              backgroundColor: currentView === 'customers' ? '#374151' : 'transparent',
            }}
          >
            Clientes
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 4,
              backgroundColor: currentView === 'reports' ? '#374151' : 'transparent',
            }}
          >
            Relatórios
          </button>
          <span style={{ marginLeft: 'auto', padding: '8px 0' }}>
            {selectedEvent.name}
          </span>
        </nav>
      )}

      {/* Main Content */}
      {renderCurrentView()}
    </div>
  );
};

export default App;
