import React from 'react';
import { Event, EventCategory, TouchTargets } from '@cantina-pos/shared';
import { getCardStyles, getListStyles, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';
import { usePlatform } from '../../hooks';
import { getTouchButtonStyles, getResponsiveFontSize, getResponsiveContainerStyles } from '../../styles';

interface EventListProps {
  events: Event[];
  categories?: EventCategory[];
  groupByCategory?: boolean;
  loading: boolean;
  onEventSelect: (event: Event) => void;
  onCreateEvent: () => void;
  onCloseEvent?: (event: Event) => void;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  categories = [],
  groupByCategory = false,
  loading,
  onEventSelect,
  onCreateEvent,
  onCloseEvent,
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

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  // Group events by category if needed
  const groupedEvents = React.useMemo(() => {
    if (!groupByCategory || categories.length === 0) {
      return { ungrouped: events };
    }
    
    const groups: Record<string, Event[]> = {};
    events.forEach(event => {
      const categoryId = event.categoryId || 'uncategorized';
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(event);
    });
    return groups;
  }, [events, groupByCategory, categories]);

  const renderEventCard = (event: Event, showCategory: boolean = false) => {
    const cardStyles = getCardStyles({ onPress: () => onEventSelect(event) });
    return (
      <div
        key={event.id}
        style={{
          ...cardStyles.container,
          padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
          minHeight: touchTarget.recommended,
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          gap: Spacing.sm,
        }}>
          <button
            onClick={() => onEventSelect(event)}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: isTouch ? 'default' : 'pointer',
            }}
          >
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
            {showCategory && event.categoryId && (
              <span style={{
                display: 'inline-block',
                marginTop: Spacing.xs,
                padding: `${Spacing.xs}px ${Spacing.sm}px`,
                backgroundColor: Colors.backgroundSecondary,
                borderRadius: BorderRadius.sm,
                fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                color: Colors.textSecondary,
              }}>
                {getCategoryName(event.categoryId)}
              </span>
            )}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: Spacing.xs }}>
            {getStatusBadge(event.status)}
            {event.status === 'active' && onCloseEvent && (
              <button
                onClick={(e) => { e.stopPropagation(); onCloseEvent(event); }}
                style={{
                  padding: `${Spacing.xs}px ${Spacing.sm}px`,
                  backgroundColor: Colors.warning,
                  color: Colors.text,
                  border: 'none',
                  borderRadius: BorderRadius.sm,
                  fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                  cursor: isTouch ? 'default' : 'pointer',
                }}
              >
                Encerrar
              </button>
            )}
          </div>
        </div>
      </div>
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
      ) : groupByCategory && Object.keys(groupedEvents).length > 1 ? (
        // Render grouped by category
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.lg }}>
          {categories.map(category => {
            const categoryEvents = groupedEvents[category.id] || [];
            if (categoryEvents.length === 0) return null;
            
            return (
              <div key={category.id}>
                <h2 style={{
                  fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                  fontWeight: 600,
                  color: Colors.text,
                  marginBottom: Spacing.md,
                  paddingBottom: Spacing.xs,
                  borderBottom: `2px solid ${Colors.primary}`,
                }}>
                  {category.name}
                  <span style={{
                    marginLeft: Spacing.sm,
                    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                    fontWeight: 400,
                    color: Colors.textSecondary,
                  }}>
                    ({categoryEvents.length})
                  </span>
                </h2>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
                }}>
                  {categoryEvents.map(event => renderEventCard(event, false))}
                </div>
              </div>
            );
          })}
          
          {/* Uncategorized events */}
          {groupedEvents['uncategorized']?.length > 0 && (
            <div>
              <h2 style={{
                fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                fontWeight: 600,
                color: Colors.textSecondary,
                marginBottom: Spacing.md,
                paddingBottom: Spacing.xs,
                borderBottom: `2px solid ${Colors.border}`,
              }}>
                Sem categoria
                <span style={{
                  marginLeft: Spacing.sm,
                  fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  fontWeight: 400,
                }}>
                  ({groupedEvents['uncategorized'].length})
                </span>
              </h2>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
              }}>
                {groupedEvents['uncategorized'].map(event => renderEventCard(event, false))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Render flat list
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
        }}>
          {events.map(event => renderEventCard(event, groupByCategory && categories.length > 0))}
        </div>
      )}
    </div>
  );
};
