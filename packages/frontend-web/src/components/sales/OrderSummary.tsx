import React from 'react';
import { OrderItem, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

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
  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: Colors.background,
      borderLeft: `1px solid ${Colors.border}`,
    }}>
      {/* Header */}
      <div style={{
        padding: Spacing.md,
        borderBottom: `1px solid ${Colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: FontSizes.lg,
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
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              backgroundColor: 'transparent',
              color: Colors.danger,
              border: `1px solid ${Colors.danger}`,
              borderRadius: BorderRadius.sm,
              fontSize: FontSizes.sm,
              cursor: loading ? 'not-allowed' : 'pointer',
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
        padding: Spacing.sm,
      }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.xl,
            color: Colors.textSecondary,
          }}>
            <p style={{ margin: 0, fontSize: FontSizes.md }}>
              Nenhum item no pedido
            </p>
            <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.sm }}>
              Selecione itens do menu para adicionar
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {items.map(item => (
              <div
                key={item.menuItemId}
                style={{
                  padding: Spacing.sm,
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
                    fontSize: FontSizes.sm,
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
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: Spacing.xs,
                      fontSize: FontSizes.md,
                      lineHeight: 1,
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
                  {/* Quantity Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: Spacing.xs,
                  }}>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                      disabled={loading || item.quantity <= 1}
                      style={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: Colors.background,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.sm,
                        cursor: loading || item.quantity <= 1 ? 'not-allowed' : 'pointer',
                        opacity: loading || item.quantity <= 1 ? 0.5 : 1,
                        fontSize: FontSizes.md,
                        fontWeight: 600,
                      }}
                    >
                      −
                    </button>
                    <span style={{
                      minWidth: 30,
                      textAlign: 'center',
                      fontSize: FontSizes.md,
                      fontWeight: 600,
                      color: Colors.text,
                    }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                      disabled={loading}
                      style={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: Colors.background,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.sm,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1,
                        fontSize: FontSizes.md,
                        fontWeight: 600,
                      }}
                    >
                      +
                    </button>
                  </div>
                  {/* Item Total */}
                  <span style={{
                    fontSize: FontSizes.sm,
                    fontWeight: 600,
                    color: Colors.primary,
                  }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
                <div style={{
                  fontSize: FontSizes.xs,
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
        padding: Spacing.md,
        borderTop: `1px solid ${Colors.border}`,
        backgroundColor: Colors.backgroundSecondary,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: Spacing.md,
        }}>
          <span style={{
            fontSize: FontSizes.lg,
            fontWeight: 600,
            color: Colors.text,
          }}>
            Total
          </span>
          <span style={{
            fontSize: FontSizes.xl,
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
            width: '100%',
            padding: Spacing.md,
            backgroundColor: items.length === 0 || loading ? Colors.secondary : Colors.success,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.lg,
            fontWeight: 600,
            cursor: items.length === 0 || loading ? 'not-allowed' : 'pointer',
            opacity: items.length === 0 || loading ? 0.6 : 1,
          }}
        >
          {loading ? 'A processar...' : 'Finalizar Pedido'}
        </button>
      </div>
    </div>
  );
};
