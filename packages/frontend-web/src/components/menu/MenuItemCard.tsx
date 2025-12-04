import React from 'react';
import { MenuItem } from '@cantina-pos/shared';
import { Colors, Spacing, FontSizes, BorderRadius, formatCurrency } from '@cantina-pos/shared';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onRemove: (itemId: string) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onEdit,
  onRemove,
}) => {
  const isInfiniteStock = item.stock === 0;
  const availableStock = isInfiniteStock ? Infinity : item.stock - item.soldCount;
  const isOutOfStock = !isInfiniteStock && availableStock <= 0;

  return (
    <div
      style={{
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        border: `1px solid ${isOutOfStock ? Colors.danger : Colors.border}`,
        padding: Spacing.md,
        opacity: isOutOfStock ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: FontSizes.md, 
            fontWeight: 600, 
            color: Colors.text,
            marginBottom: Spacing.xs,
          }}>
            {item.description}
          </h4>
          <p style={{ 
            margin: 0, 
            fontSize: FontSizes.lg, 
            fontWeight: 700, 
            color: Colors.primary,
          }}>
            {formatCurrency(item.price)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: Spacing.xs }}>
          <button
            onClick={() => onEdit(item)}
            style={{
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              backgroundColor: Colors.backgroundSecondary,
              color: Colors.text,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.sm,
              fontSize: FontSizes.xs,
              cursor: 'pointer',
            }}
          >
            Editar
          </button>
          <button
            onClick={() => onRemove(item.id)}
            style={{
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              backgroundColor: Colors.danger,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.sm,
              fontSize: FontSizes.xs,
              cursor: 'pointer',
            }}
          >
            Remover
          </button>
        </div>
      </div>

      {/* Stock Info */}
      <div style={{ 
        marginTop: Spacing.sm, 
        display: 'flex', 
        gap: Spacing.md,
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
      }}>
        <span>
          Estoque: {isInfiniteStock ? '∞' : `${availableStock}/${item.stock}`}
        </span>
        <span>
          Vendidos: {item.soldCount}
        </span>
        {isOutOfStock && (
          <span style={{ color: Colors.danger, fontWeight: 600 }}>
            Esgotado
          </span>
        )}
      </div>
    </div>
  );
};
