import React from 'react';
import { MenuItem, MenuGroup, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Group Tabs */}
      <div style={{
        display: 'flex',
        gap: Spacing.xs,
        padding: Spacing.sm,
        backgroundColor: Colors.backgroundSecondary,
        borderBottom: `1px solid ${Colors.border}`,
        overflowX: 'auto',
      }}>
        <button
          onClick={() => onSelectGroup(null)}
          style={{
            padding: `${Spacing.sm}px ${Spacing.md}px`,
            backgroundColor: selectedGroupId === null ? Colors.primary : Colors.background,
            color: selectedGroupId === null ? Colors.textLight : Colors.text,
            border: `1px solid ${selectedGroupId === null ? Colors.primary : Colors.border}`,
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.sm,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Todos
        </button>
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: selectedGroupId === group.id ? Colors.primary : Colors.background,
              color: selectedGroupId === group.id ? Colors.textLight : Colors.text,
              border: `1px solid ${selectedGroupId === group.id ? Colors.primary : Colors.border}`,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.sm,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={{
        flex: 1,
        padding: Spacing.md,
        overflowY: 'auto',
      }}>
        {filteredItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.xl,
            color: Colors.textSecondary,
          }}>
            Nenhum item disponível
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: Spacing.md,
          }}>
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
                    padding: Spacing.md,
                    backgroundColor: available ? Colors.background : Colors.backgroundSecondary,
                    border: `2px solid ${available ? Colors.primary : Colors.border}`,
                    borderRadius: BorderRadius.lg,
                    cursor: available ? 'pointer' : 'not-allowed',
                    opacity: available ? 1 : 0.5,
                    minHeight: 120,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (available) {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span style={{
                    fontSize: FontSizes.md,
                    fontWeight: 600,
                    color: Colors.text,
                    textAlign: 'center',
                    marginBottom: Spacing.xs,
                  }}>
                    {item.description}
                  </span>
                  <span style={{
                    fontSize: FontSizes.lg,
                    fontWeight: 700,
                    color: Colors.primary,
                  }}>
                    {formatPrice(item.price)}
                  </span>
                  {/* Stock indicator */}
                  <span style={{
                    fontSize: FontSizes.xs,
                    color: !available ? Colors.danger : isInfinite ? Colors.success : Colors.textSecondary,
                    marginTop: Spacing.xs,
                  }}>
                    {!available 
                      ? 'Esgotado' 
                      : isInfinite 
                        ? '∞ disponível' 
                        : `${availableStock} disponível`}
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
