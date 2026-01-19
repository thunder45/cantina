import React from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem, MenuGroup, Colors, Spacing, FontSizes, BorderRadius, TouchTargets } from '@cantina-pos/shared';
import { usePlatform } from '../../hooks';
import { getResponsiveGridStyles, getTouchButtonStyles, getResponsiveFontSize } from '../../styles';

interface MenuItemGridProps {
  menuItems: MenuItem[];
  groups: MenuGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onAddItem: (item: MenuItem) => void;
  getAvailableStock: (item: MenuItem) => number;
}

export const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  menuItems,
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddItem,
  getAvailableStock,
}) => {
  const { t } = useTranslation();
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };

  const filteredItems = selectedGroupId
    ? menuItems.filter(item => item.groupId === selectedGroupId)
    : menuItems;

  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  const isItemAvailable = (item: MenuItem): boolean => {
    if (item.stock === 0) return true; // Infinite stock
    return getAvailableStock(item) > 0;
  };

  // Responsive grid configuration
  const gridMinWidth = platform === 'tablet' ? 180 : platform === 'mobile' ? 130 : 150;
  const gridStyles = getResponsiveGridStyles(styleOptions, gridMinWidth);
  const touchTarget = TouchTargets[platform];

  // Responsive item card height
  const cardMinHeight = platform === 'tablet' ? 140 : platform === 'mobile' ? 100 : 120;

  // Tab button styles
  const getTabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...getTouchButtonStyles(styleOptions),
    padding: `${Spacing.sm}px ${platform === 'tablet' ? Spacing.lg : Spacing.md}px`,
    backgroundColor: isActive ? Colors.primary : Colors.background,
    color: isActive ? Colors.textLight : Colors.text,
    border: `1px solid ${isActive ? Colors.primary : Colors.border}`,
    borderRadius: BorderRadius.md,
    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
    fontWeight: 500,
    whiteSpace: 'nowrap',
    minHeight: touchTarget.minSize,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Group Tabs - scrollable on mobile, fixed on larger screens */}
      <div style={{
        display: 'flex',
        gap: platform === 'tablet' ? Spacing.md : Spacing.xs,
        padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
        backgroundColor: Colors.backgroundSecondary,
        borderBottom: `1px solid ${Colors.border}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        // Hide scrollbar on touch devices
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        <button
          onClick={() => onSelectGroup(null)}
          style={getTabButtonStyle(selectedGroupId === null)}
        >
          {t('common.all')}
        </button>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            style={getTabButtonStyle(selectedGroupId === group.id)}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={{
        flex: 1,
        padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.xl,
            color: Colors.textSecondary,
            fontSize: getResponsiveFontSize(styleOptions, 'md'),
          }}>
            {t('menu.noItemsAvailable')}
          </div>
        ) : (
          <div style={gridStyles}>
            {filteredItems.map(item => {
              const available = isItemAvailable(item);
              const availableStock = getAvailableStock(item);
              const isInfinite = item.stock === 0;

              return (
                <button
                  key={item.id}
                  onClick={() => available && onAddItem(item)}
                  disabled={!available}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
                    backgroundColor: available ? Colors.background : Colors.backgroundSecondary,
                    border: `2px solid ${available ? Colors.primary : Colors.border}`,
                    borderRadius: BorderRadius.lg,
                    cursor: available ? (isTouch ? 'default' : 'pointer') : 'not-allowed',
                    opacity: available ? 1 : 0.5,
                    minHeight: cardMinHeight,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    // Touch optimization
                    WebkitTapHighlightColor: 'transparent',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (available && !isTouch) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  // Touch feedback
                  onTouchStart={(e) => {
                    if (available && isTouch) {
                      e.currentTarget.style.transform = 'scale(0.98)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span style={{
                    fontSize: getResponsiveFontSize(styleOptions, 'md'),
                    fontWeight: 600,
                    color: Colors.text,
                    textAlign: 'center',
                    marginBottom: Spacing.xs,
                    // Ensure text doesn't overflow on mobile
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                  }}>
                    {item.description}
                  </span>
                  <span style={{
                    fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                    fontWeight: 700,
                    color: Colors.primary,
                  }}>
                    {formatPrice(item.price)}
                  </span>
                  {/* Stock indicator */}
                  <span style={{
                    fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                    color: !available ? Colors.danger : isInfinite ? Colors.success : Colors.textSecondary,
                    marginTop: Spacing.xs,
                  }}>
                    {!available 
                      ? t('menu.soldOut') 
                      : isInfinite 
                        ? `∞ ${t('menu.available')}` 
                        : `${availableStock} ${t('menu.available')}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
