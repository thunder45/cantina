import React, { useState, useReducer, useMemo, useEffect } from 'react';
import { Event, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';
import { ApiClient } from '@cantina-pos/shared';
import { appReducer, initialState } from '@cantina-pos/shared';
import { EventsPage, MenuPage, SalesPage, CustomersPage, ReportsPage } from './pages';
import { usePlatform, useKeyboardShortcuts, KeyboardShortcut } from './hooks';
import { getResponsiveNavStyles, getTouchButtonStyles } from './styles';
import { AuthProvider, ProtectedRoute, useAuth } from './auth';

// Create API client instance
const apiClient = new ApiClient({
  baseUrl: (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api',
  getAuthToken: async () => localStorage.getItem('session'),
  onUnauthorized: () => {
    window.location.reload(); // Will show login page
  },
});

type AppView = 'events' | 'menu' | 'sales' | 'customers' | 'reports';

const getViewFromHash = (): AppView => {
  const hash = window.location.hash.slice(1) as AppView;
  return ['events', 'menu', 'sales', 'customers', 'reports'].includes(hash) ? hash : 'events';
};

const getStoredEvent = (): Event | null => {
  try {
    const stored = localStorage.getItem('selectedEvent');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [currentView, setCurrentView] = useState<AppView>(getViewFromHash);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(getStoredEvent);

  // Sync URL hash with currentView
  useEffect(() => {
    window.location.hash = currentView;
  }, [currentView]);

  useEffect(() => {
    const onHashChange = () => setCurrentView(getViewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist selectedEvent to localStorage
  useEffect(() => {
    if (selectedEvent) {
      localStorage.setItem('selectedEvent', JSON.stringify(selectedEvent));
    } else {
      localStorage.removeItem('selectedEvent');
    }
  }, [selectedEvent]);
  
  // Platform detection for responsive design
  const platformInfo = usePlatform();
  const { platform, orientation, isTouch } = platformInfo;

  // Keyboard shortcuts for desktop optimization
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    { key: 'e', description: 'Go to Events', action: () => setCurrentView('events') },
    { key: 'm', description: 'Go to Menu', action: () => selectedEvent && setCurrentView('menu') },
    { key: 's', description: 'Go to Sales', action: () => selectedEvent && setCurrentView('sales') },
    { key: 'c', description: 'Go to Customers', action: () => setCurrentView('customers') },
    { key: 'r', description: 'Go to Reports', action: () => selectedEvent && setCurrentView('reports') },
  ], [selectedEvent]);

  // Enable keyboard shortcuts only on desktop
  useKeyboardShortcuts(shortcuts, platform === 'desktop' && selectedEvent !== null);

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
        return <CustomersPage apiClient={apiClient} />;
      case 'reports':
        return selectedEvent ? (
          <ReportsPage apiClient={apiClient} event={selectedEvent} />
        ) : null;
      default:
        return null;
    }
  };

  // Responsive style options
  const styleOptions = { platform, orientation, isTouch };
  const navStyles = getResponsiveNavStyles(styleOptions);
  const buttonStyles = getTouchButtonStyles(styleOptions);

  // Navigation button style
  const getNavButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...buttonStyles,
    background: 'none',
    border: 'none',
    color: 'white',
    padding: platform === 'mobile' ? `${Spacing.sm}px ${Spacing.sm}px` : `${Spacing.sm}px ${Spacing.md}px`,
    borderRadius: BorderRadius.sm,
    backgroundColor: isActive ? '#374151' : 'transparent',
    fontSize: platform === 'mobile' ? FontSizes.sm : FontSizes.md,
    whiteSpace: 'nowrap',
    minWidth: platform === 'mobile' ? 'auto' : buttonStyles.minWidth,
  });

  return (
    <div style={{ 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
      // Prevent pull-to-refresh on mobile
      overscrollBehavior: 'none',
    }}>
      {/* Navigation */}
      <nav style={{
        ...navStyles,
        backgroundColor: '#1f2937',
        color: 'white',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: platform === 'mobile' ? Spacing.xs : Spacing.md, alignItems: 'center' }}>
          <button
            onClick={() => setCurrentView('events')}
            style={getNavButtonStyle(currentView === 'events')}
            title={platform === 'desktop' ? 'Press E' : undefined}
          >
            {platform !== 'mobile' && 'Eventos'}
            {platform === 'mobile' && '📅'}
          </button>
          {selectedEvent && (
            <>
              <button
                onClick={() => setCurrentView('menu')}
                style={getNavButtonStyle(currentView === 'menu')}
            title={platform === 'desktop' ? 'Press M' : undefined}
          >
            Menu
          </button>
          <button
            onClick={() => setCurrentView('sales')}
            style={getNavButtonStyle(currentView === 'sales')}
            title={platform === 'desktop' ? 'Press S' : undefined}
          >
            Vendas
          </button>
          <button
            onClick={() => setCurrentView('customers')}
            style={getNavButtonStyle(currentView === 'customers')}
            title={platform === 'desktop' ? 'Press C' : undefined}
          >
            Clientes
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            style={getNavButtonStyle(currentView === 'reports')}
            title={platform === 'desktop' ? 'Press R' : undefined}
          >
            Relatórios
          </button>
          </>
        )}
        </div>

        {/* ADVM Logo - Centered */}
        <img 
          src="/logo.jpg" 
          alt="ADVM" 
          style={{
            height: '36px',
            width: 'auto',
            borderRadius: BorderRadius.sm,
          }}
        />

        {/* Event name and user on right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.md }}>
          {selectedEvent && (
            <span style={{ 
              fontSize: platform === 'mobile' ? FontSizes.xs : FontSizes.sm,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: platform === 'mobile' ? 60 : 120,
            }}>
              {selectedEvent.name}
            </span>
          )}
          {user && (
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: `${Spacing.xs}px ${Spacing.sm}px`,
                borderRadius: BorderRadius.sm,
                fontSize: FontSizes.xs,
                cursor: 'pointer',
              }}
              title={user.email}
            >
              Sair
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{
        height: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>
        {renderCurrentView()}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default App;
