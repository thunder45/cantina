import React from 'react';
import { OrderItem, Colors, Spacing, FontSizes, BorderRadius, TouchTargets } from '@cantina-pos/shared';
import { usePlatform } from '../../hooks';
import { getTouchButtonStyles, getResponsiveFontSize, getResponsivePanelWidth } from '../../styles';

interface OrderSummaryProps {
  items: OrderItem[];
  total: number;
  onUpdateQuantity: (menuItemId: string, quantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  loading?: boolean;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  loading = false,
}) => {
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };
  const touchTarget = TouchTargets[platform];

  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  // Responsive panel width
  const panelWidth = getResponsivePanelWidth(styleOptions);

  // Quantity button size based on platform
  const qtyButtonSize = platform === 'tablet' ? 44 : platform === 'mobile' ? 36 : 28;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: panelWidth,
      backgroundColor: Colors.background,
      borderLeft: platform !== 'mobile' ? `1px solid ${Colors.border}` : 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
        borderBottom: `1px solid ${Colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: getResponsiveFontSize(styleOptions, 'lg'),
          fontWeight: 600,
          color: Colors.text,
        }}>
          Pedido Atual
        </h3>
        {items.length > 0 && (
          <button
            onClick={onClearOrder}
            disabled={loading}
            style={{
              ...getTouchButtonStyles(styleOptions),
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: 'transparent',
              color: Colors.danger,
              border: `1px solid ${Colors.danger}`,
              borderRadius: BorderRadius.sm,
              fontSize: getResponsiveFontSize(styleOptions, 'sm'),
              cursor: loading ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
              opacity: loading ? 0.5 : 1,
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Items List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
        WebkitOverflowScrolling: 'touch',
      }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.xl,
            color: Colors.textSecondary,
          }}>
            <p style={{ margin: 0, fontSize: getResponsiveFontSize(styleOptions, 'md') }}>
              Nenhum item no pedido
            </p>
            <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: getResponsiveFontSize(styleOptions, 'sm') }}>
              Selecione itens do menu para adicionar
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: platform === 'tablet' ? Spacing.md : Spacing.sm }}>
            {items.map(item => (
              <div
                key={item.menuItemId}
                style={{
                  padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                  backgroundColor: Colors.backgroundSecondary,
                  borderRadius: BorderRadius.md,
                  border: `1px solid ${Colors.border}`,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: Spacing.xs,
                }}>
                  <span style={{
                    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                    fontWeight: 500,
                    color: Colors.text,
                    flex: 1,
                  }}>
                    {item.description}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.menuItemId)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: Colors.danger,
                      cursor: loading ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
                      padding: Spacing.sm,
                      fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                      lineHeight: 1,
                      minWidth: touchTarget.minSize,
                      minHeight: touchTarget.minSize,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Remover item"
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {/* Quantity Controls - larger touch targets */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: platform === 'tablet' ? Spacing.sm : Spacing.xs,
                  }}>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                      disabled={loading || item.quantity <= 1}
                      style={{
                        width: qtyButtonSize,
                        height: qtyButtonSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: Colors.background,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.sm,
                        cursor: loading || item.quantity <= 1 ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
                        opacity: loading || item.quantity <= 1 ? 0.5 : 1,
                        fontSize: getResponsiveFontSize(styleOptions, 'md'),
                        fontWeight: 600,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      minWidth: platform === 'tablet' ? 40 : 30,
                      textAlign: 'center',
                      fontSize: getResponsiveFontSize(styleOptions, 'md'),
                      fontWeight: 600,
                      color: Colors.text,
                    }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                      disabled={loading}
                      style={{
                        width: qtyButtonSize,
                        height: qtyButtonSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: Colors.background,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.sm,
                        cursor: loading ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
                        opacity: loading ? 0.5 : 1,
                        fontSize: getResponsiveFontSize(styleOptions, 'md'),
                        fontWeight: 600,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      +
                    </button>
                  </div>
                  {/* Item Total */}
                  <span style={{
                    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                    fontWeight: 600,
                    color: Colors.primary,
                  }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
                <div style={{
                  fontSize: getResponsiveFontSize(styleOptions, 'xs'),
                  color: Colors.textSecondary,
                  marginTop: Spacing.xs,
                }}>
                  {formatPrice(item.price)} × {item.quantity}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Total and Checkout */}
      <div style={{
        padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
        borderTop: `1px solid ${Colors.border}`,
        backgroundColor: Colors.backgroundSecondary,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: platform === 'tablet' ? Spacing.lg : Spacing.md,
        }}>
          <span style={{
            fontSize: getResponsiveFontSize(styleOptions, 'lg'),
            fontWeight: 600,
            color: Colors.text,
          }}>
            Total
          </span>
          <span style={{
            fontSize: getResponsiveFontSize(styleOptions, 'xl'),
            fontWeight: 700,
            color: Colors.primary,
          }}>
            {formatPrice(total)}
          </span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          style={{
            ...getTouchButtonStyles(styleOptions),
            width: '100%',
            padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
            backgroundColor: items.length === 0 || loading ? Colors.secondary : Colors.success,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: getResponsiveFontSize(styleOptions, 'lg'),
            fontWeight: 600,
            cursor: items.length === 0 || loading ? 'not-allowed' : (isTouch ? 'default' : 'pointer'),
            opacity: items.length === 0 || loading ? 0.6 : 1,
            minHeight: platform === 'tablet' ? 56 : touchTarget.recommended,
          }}
        >
          {loading ? 'A processar...' : 'Finalizar Pedido'}
        </button>
        <div style={{ height: 10 }} />
      </div>
    </div>
  );
};
