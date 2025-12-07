import React from 'react';
import { EventCategory, TouchTargets } from '@cantina-pos/shared';
import { getCardStyles, getListStyles, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';
import { usePlatform } from '../../hooks';
import { getTouchButtonStyles, getResponsiveFontSize, getResponsiveContainerStyles } from '../../styles';

interface CategoryListProps {
  categories: EventCategory[];
  eventCounts: Record<string, number>;
  loading: boolean;
  onCategorySelect: (category: EventCategory) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: EventCategory) => void;
  onDeleteCategory: (category: EventCategory) => void;
  onViewReport?: (category: EventCategory) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  eventCounts,
  loading,
  onCategorySelect,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onViewReport,
}) => {
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };
  const touchTarget = TouchTargets[platform];
  const listStyles = getListStyles();
  const containerStyles = getResponsiveContainerStyles(styleOptions);

  if (loading) {
    return (
      <div style={{ ...listStyles.loadingContainer, padding: Spacing.xl }}>
        <p style={{ color: Colors.textSecondary, fontSize: getResponsiveFontSize(styleOptions, 'md') }}>
          A carregar categorias...
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
          Categorias de Eventos
        </h1>
        <button
          onClick={onCreateCategory}
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
          + Nova Categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <div style={{ ...listStyles.emptyContainer, textAlign: 'center', padding: Spacing.xl }}>
          <p style={{ ...listStyles.emptyText, fontSize: getResponsiveFontSize(styleOptions, 'md') }}>
            Nenhuma categoria encontrada
          </p>
          <p style={{ 
            ...listStyles.emptyText, 
            marginTop: Spacing.sm,
            fontSize: getResponsiveFontSize(styleOptions, 'sm'),
          }}>
            Crie uma nova categoria para começar
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
        }}>
          {categories.map((category) => {
            const cardStyles = getCardStyles({ onPress: () => onCategorySelect(category) });
            const eventCount = eventCounts[category.id] || 0;
            
            return (
              <div
                key={category.id}
                style={{
                  ...cardStyles.container,
                  padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: Spacing.md,
                }}
              >
                <button
                  onClick={() => onCategorySelect(category)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: isTouch ? 'default' : 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    minHeight: touchTarget.recommended,
                    display: 'flex',
                    alignItems: 'center',
                    gap: Spacing.md,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      ...cardStyles.title, 
                      fontSize: getResponsiveFontSize(styleOptions, 'md'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: Spacing.sm,
                    }}>
                      {category.name}
                      {category.isDefault && (
                        <span style={{
                          padding: `${Spacing.xs}px ${Spacing.sm}px`,
                          backgroundColor: Colors.secondary,
                          color: Colors.textLight,
                          borderRadius: BorderRadius.full,
                          fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                          fontWeight: 500,
                        }}>
                          Padrão
                        </span>
                      )}
                    </h3>
                    <p style={{ 
                      ...cardStyles.subtitle,
                      fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                      marginTop: Spacing.xs,
                    }}>
                      {eventCount} {eventCount === 1 ? 'evento' : 'eventos'}
                    </p>
                  </div>
                </button>
                
                <div style={{ display: 'flex', gap: Spacing.xs }}>
                  {onViewReport && eventCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewReport(category);
                      }}
                      style={{
                        padding: Spacing.sm,
                        backgroundColor: Colors.secondary,
                        border: 'none',
                        borderRadius: BorderRadius.md,
                        cursor: isTouch ? 'default' : 'pointer',
                        minWidth: touchTarget.minSize,
                        minHeight: touchTarget.minSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Ver Relatório"
                    >
                      📊
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCategory(category);
                    }}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: Colors.backgroundSecondary,
                      border: `1px solid ${Colors.border}`,
                      borderRadius: BorderRadius.md,
                      cursor: isTouch ? 'default' : 'pointer',
                      minWidth: touchTarget.minSize,
                      minHeight: touchTarget.minSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(category);
                    }}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: eventCount > 0 ? Colors.backgroundSecondary : Colors.danger,
                      border: `1px solid ${eventCount > 0 ? Colors.border : Colors.danger}`,
                      borderRadius: BorderRadius.md,
                      cursor: eventCount > 0 ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
                      opacity: eventCount > 0 ? 0.5 : 1,
                      minWidth: touchTarget.minSize,
                      minHeight: touchTarget.minSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    disabled={eventCount > 0}
                    title={eventCount > 0 ? 'Não é possível excluir categoria com eventos' : 'Excluir'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
