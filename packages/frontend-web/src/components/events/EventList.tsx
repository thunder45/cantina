import React from 'react';
import { Event } from '@cantina-pos/shared';
import { getCardStyles, getListStyles, Colors, Spacing, FontSizes } from '@cantina-pos/shared';

interface EventListProps {
  events: Event[];
  loading: boolean;
  onEventSelect: (event: Event) => void;
  onCreateEvent: () => void;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  loading,
  onEventSelect,
  onCreateEvent,
}) => {
  const listStyles = getListStyles();

  const formatDates = (dates: string[]): string => {
    if (dates.length === 0) return '';
    if (dates.length === 1) {
      return new Date(dates[0]).toLocaleDateString('pt-PT');
    }
    const sorted = [...dates].sort();
    return `${new Date(sorted[0]).toLocaleDateString('pt-PT')} - ${new Date(sorted[sorted.length - 1]).toLocaleDateString('pt-PT')} (${dates.length} dias)`;
  };

  const getStatusBadge = (status: 'active' | 'closed') => {
    const isActive = status === 'active';
    return (
      <span
        style={{
          padding: `${Spacing.xs}px ${Spacing.sm}px`,
          borderRadius: 9999,
          fontSize: FontSizes.xs,
          fontWeight: 600,
          backgroundColor: isActive ? Colors.success : Colors.secondary,
          color: Colors.textLight,
        }}
      >
        {isActive ? 'Ativo' : 'Encerrado'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ ...listStyles.loadingContainer, padding: Spacing.xl }}>
        <p style={{ color: Colors.textSecondary }}>A carregar eventos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: Spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
        <h1 style={{ fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text, margin: 0 }}>
          Eventos
        </h1>
        <button
          onClick={onCreateEvent}
          style={{
            padding: `${Spacing.sm}px ${Spacing.md}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: 8,
            fontSize: FontSizes.md,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Novo Evento
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ ...listStyles.emptyContainer, textAlign: 'center' }}>
          <p style={listStyles.emptyText}>Nenhum evento encontrado</p>
          <p style={{ ...listStyles.emptyText, marginTop: Spacing.sm }}>
            Crie um novo evento para começar
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
          {events.map((event) => {
            const cardStyles = getCardStyles({ onPress: () => onEventSelect(event) });
            return (
              <div
                key={event.id}
                onClick={() => onEventSelect(event)}
                style={{
                  ...cardStyles.container,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = Colors.primary;
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Colors.border;
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={cardStyles.title}>{event.name}</h3>
                    <p style={cardStyles.subtitle}>{formatDates(event.dates)}</p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
                {event.categories.length > 0 && (
                  <div style={{ display: 'flex', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.sm }}>
                    {event.categories.map((category, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: `${Spacing.xs}px ${Spacing.sm}px`,
                          backgroundColor: Colors.backgroundSecondary,
                          borderRadius: 4,
                          fontSize: FontSizes.xs,
                          color: Colors.textSecondary,
                        }}
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
