import React from 'react';
import { Event, TouchTargets } from '@cantina-pos/shared';
import { getCardStyles, getListStyles, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';
import { usePlatform } from '../../hooks';
import { getTouchButtonStyles, getResponsiveFontSize, getResponsiveContainerStyles } from '../../styles';

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
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };
  const touchTarget = TouchTargets[platform];
  const listStyles = getListStyles();
  const containerStyles = getResponsiveContainerStyles(styleOptions);

  const formatDates = (dates: string[]): string => {
    if (dates.length === 0) return '';
    if (dates.length === 1) {
      return new Date(dates[0]).toLocaleDateString('pt-PT');
    }
    const sorted = [...dates].sort();
    // On mobile, use shorter format
    if (platform === 'mobile') {
      return `${dates.length} dias`;
    }
    return `${new Date(sorted[0]).toLocaleDateString('pt-PT')} - ${new Date(sorted[sorted.length - 1]).toLocaleDateString('pt-PT')} (${dates.length} dias)`;
  };

  const getStatusBadge = (status: 'active' | 'closed') => {
    const isActive = status === 'active';
    return (
      <span
        style={{
          padding: `${Spacing.xs}px ${Spacing.sm}px`,
          borderRadius: BorderRadius.full,
          fontSize: getResponsiveFontSize(styleOptions, 'xs'),
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
        <p style={{ color: Colors.textSecondary, fontSize: getResponsiveFontSize(styleOptions, 'md') }}>
          A carregar eventos...
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: platform === 'tablet' ? Spacing.xl : Spacing.lg,
        flexWrap: platform === 'mobile' ? 'wrap' : 'nowrap',
        gap: Spacing.sm,
      }}>
        <h1 style={{ 
          fontSize: getResponsiveFontSize(styleOptions, 'xl'), 
          fontWeight: 600, 
          color: Colors.text, 
          margin: 0,
          flex: platform === 'mobile' ? '1 1 100%' : 'none',
        }}>
          Eventos
        </h1>
        <button
          onClick={onCreateEvent}
          style={{
            ...getTouchButtonStyles(styleOptions),
            padding: `${Spacing.sm}px ${platform === 'tablet' ? Spacing.lg : Spacing.md}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: getResponsiveFontSize(styleOptions, 'md'),
            fontWeight: 600,
            cursor: isTouch ? 'default' : 'pointer',
            minHeight: touchTarget.recommended,
            width: platform === 'mobile' ? '100%' : 'auto',
          }}
        >
          + Novo Evento
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ ...listStyles.emptyContainer, textAlign: 'center', padding: Spacing.xl }}>
          <p style={{ ...listStyles.emptyText, fontSize: getResponsiveFontSize(styleOptions, 'md') }}>
            Nenhum evento encontrado
          </p>
          <p style={{ 
            ...listStyles.emptyText, 
            marginTop: Spacing.sm,
            fontSize: getResponsiveFontSize(styleOptions, 'sm'),
          }}>
            Crie um novo evento para começar
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
        }}>
          {events.map((event) => {
            const cardStyles = getCardStyles({ onPress: () => onEventSelect(event) });
            return (
              <button
                key={event.id}
                onClick={() => onEventSelect(event)}
                style={{
                  ...cardStyles.container,
                  cursor: isTouch ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
                  minHeight: touchTarget.recommended,
                  textAlign: 'left',
                  width: '100%',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isTouch) {
                    e.currentTarget.style.borderColor = Colors.primary;
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Colors.border;
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
                onTouchStart={(e) => {
                  if (isTouch) {
                    e.currentTarget.style.backgroundColor = Colors.backgroundSecondary;
                  }
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.background;
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: Spacing.sm,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      ...cardStyles.title, 
                      fontSize: getResponsiveFontSize(styleOptions, 'md'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.name}
                    </h3>
                    <p style={{ 
                      ...cardStyles.subtitle,
                      fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                    }}>
                      {formatDates(event.dates)}
                    </p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
                {event.categories.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: Spacing.xs, 
                    flexWrap: 'wrap', 
                    marginTop: Spacing.sm,
                  }}>
                    {event.categories.slice(0, platform === 'mobile' ? 3 : event.categories.length).map((category, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: `${Spacing.xs}px ${Spacing.sm}px`,
                          backgroundColor: Colors.backgroundSecondary,
                          borderRadius: BorderRadius.sm,
                          fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                          color: Colors.textSecondary,
                        }}
                      >
                        {category}
                      </span>
                    ))}
                    {platform === 'mobile' && event.categories.length > 3 && (
                      <span
                        style={{
                          padding: `${Spacing.xs}px ${Spacing.sm}px`,
                          backgroundColor: Colors.backgroundSecondary,
                          borderRadius: BorderRadius.sm,
                          fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                          color: Colors.textSecondary,
                        }}
                      >
                        +{event.categories.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
