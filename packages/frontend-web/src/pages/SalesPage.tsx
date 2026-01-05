import React, { useState, useCallback, useEffect } from 'react';
import {
  Event,
  Order,
  Sale,
  PaymentPart,
  ApiClient,
  SalesApiService,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';
import {
  OrderBuilder,
  PaymentModal,
  ReceiptModal,
} from '../components/sales';

interface SaleWithCustomer extends Sale {
  customerName?: string;
}

interface SalesPageProps {
  apiClient: ApiClient;
  event: Event;
  onBack: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  apiClient,
  event,
  onBack,
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [salesHistory, setSalesHistory] = useState<SaleWithCustomer[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistorySale, setSelectedHistorySale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderKey, setOrderKey] = useState(0); // Key to force OrderBuilder reset

  const salesService = new SalesApiService(apiClient);
  const customerService = new CustomerApiService(apiClient);

  // Load sales history with customer names
  const loadSalesHistory = useCallback(async () => {
    try {
      const sales = await salesService.getSales(event.id);
      const sortedSales = sales.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Fetch customer names for sales with customerId
      const salesWithNames: SaleWithCustomer[] = await Promise.all(
        sortedSales.map(async (sale) => {
          if (sale.customerId) {
            try {
              const customer = await customerService.getCustomer(sale.customerId);
              return { ...sale, customerName: customer.name };
            } catch {
              return sale;
            }
          }
          return sale;
        })
      );
      
      setSalesHistory(salesWithNames);
    } catch (err) {
      console.error('Failed to load sales history:', err);
    }
  }, [event.id]);

  useEffect(() => {
    loadSalesHistory();
  }, [loadSalesHistory]);

  // Handle checkout - show payment modal
  const handleCheckout = useCallback((order: Order) => {
    setCurrentOrder(order);
    setShowPayment(true);
  }, []);

  // Handle payment confirmation
  const handleConfirmPayment = useCallback(async (
    payments: PaymentPart[],
    customerId?: string
  ) => {
    if (!currentOrder) return;

    try {
      setLoading(true);
      setError(null);
      const sale = await salesService.confirmSale(
        currentOrder.id,
        payments,
        customerId
      );
      setLastSale(sale);
      setShowPayment(false);
      setShowReceipt(true);
      setCurrentOrder(null);
      // Refresh sales history
      loadSalesHistory();
    } catch (err) {
      setError('Erro ao confirmar venda');
      console.error('Failed to confirm sale:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrder, loadSalesHistory]);

  // Handle refund
  const handleRefund = useCallback((sale: Sale) => {
    // Update sales history
    setSalesHistory(history =>
      history.map(s => s.id === sale.id ? { ...s, isRefunded: true } : s)
    );
    setSelectedHistorySale(null);
    // Reload menu items to update stock quantities
    setOrderKey(prev => prev + 1);
  }, []);

  // Format price
  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: Colors.backgroundSecondary,
    }}>
      {/* Error Banner */}
      {error && (
        <div style={{
          padding: Spacing.sm,
          backgroundColor: Colors.danger,
          color: Colors.textLight,
          textAlign: 'center',
          fontSize: FontSizes.sm,
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: Spacing.md,
              background: 'none',
              border: 'none',
              color: Colors.textLight,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: FontSizes.lg,
            fontWeight: 600,
            color: Colors.text,
          }}>
            Modo de Vendas
          </h2>
          <p style={{
            margin: 0,
            marginTop: Spacing.xs,
            fontSize: FontSizes.sm,
            color: Colors.textSecondary,
          }}>
            {event.name}
          </p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          style={{
            padding: `${Spacing.sm}px ${Spacing.md}px`,
            backgroundColor: Colors.secondary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.sm,
            cursor: 'pointer',
          }}
        >
          Histórico ({salesHistory.length})
        </button>
      </div>

      {/* Main Content - Order Builder */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <OrderBuilder
          key={orderKey}
          apiClient={apiClient}
          event={event}
          onCheckout={handleCheckout}
          onBack={onBack}
        />
      </div>

      {/* Payment Modal */}
      {showPayment && currentOrder && (
        <PaymentModal
          apiClient={apiClient}
          order={currentOrder}
          onConfirm={handleConfirmPayment}
          onCancel={() => {
            setShowPayment(false);
            // Don't clear order - user might want to continue
          }}
          loading={loading}
        />
      )}

      {/* Receipt Modal (after sale) */}
      {showReceipt && lastSale && (
        <ReceiptModal
          apiClient={apiClient}
          sale={lastSale}
          onClose={() => {
            setShowReceipt(false);
            setLastSale(null);
            setOrderKey(prev => prev + 1); // Reset order builder
          }}
        />
      )}

      {/* Sales History Modal */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              backgroundColor: Colors.background,
              borderRadius: BorderRadius.lg,
              width: '90%',
              maxWidth: 600,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: Spacing.md,
              borderBottom: `1px solid ${Colors.border}`,
            }}>
              <h3 style={{ margin: 0, fontSize: FontSizes.lg, fontWeight: 600 }}>
                Histórico de Vendas
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: FontSizes.xl,
                  cursor: 'pointer',
                  color: Colors.textSecondary,
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: Spacing.md,
            }}>
              {salesHistory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: Spacing.xl,
                  color: Colors.textSecondary,
                }}>
                  Nenhuma venda registada
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
                  {salesHistory.map(sale => {
                    const creditAmount = sale.payments.find(p => p.method === 'credit')?.amount || 0;
                    const balanceAmount = sale.payments.find(p => p.method === 'balance')?.amount || 0;
                    const hadCredit = creditAmount > 0 || balanceAmount > 0;
                    const fullyPaid = hadCredit && sale.isPaid;
                    
                    // Determine payment method label for non-credit sales
                    const getPaymentLabel = () => {
                      if (hadCredit) return null;
                      const methods = sale.payments.map(p => {
                        const labels: Record<string, string> = { cash: 'Dinheiro', card: 'Cartão', transfer: 'Transferência' };
                        return labels[p.method] || p.method;
                      });
                      return methods.length > 1 ? 'Misto' : methods[0];
                    };
                    const paymentLabel = getPaymentLabel();
                    
                    return (
                    <button
                      key={sale.id}
                      onClick={() => setSelectedHistorySale(sale)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: Spacing.sm,
                        backgroundColor: sale.isRefunded ? '#fff5f5' : Colors.backgroundSecondary,
                        border: sale.isRefunded ? `1px solid ${Colors.danger}` : `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.md,
                        cursor: 'pointer',
                        textAlign: 'left',
                        opacity: sale.isRefunded ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                          <div>{new Date(sale.createdAt).toLocaleString('pt-PT')}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {sale.customerName && <span>• {sale.customerName}</span>}
                            {paymentLabel && <span>• {paymentLabel}</span>}
                            {creditAmount > 0 && !fullyPaid && <span style={{ backgroundColor: Colors.warning, color: '#000', padding: '1px 4px', borderRadius: 3, marginLeft: 4, fontSize: FontSizes.xs }}>Fiado</span>}
                            {fullyPaid && <span style={{ backgroundColor: Colors.success, color: Colors.textLight, padding: '1px 4px', borderRadius: 3, marginLeft: 4, fontSize: FontSizes.xs }}>Fiado Pago</span>}
                            {sale.isRefunded && <span style={{ backgroundColor: Colors.danger, color: Colors.textLight, padding: '1px 4px', borderRadius: 3, marginLeft: 4, fontSize: FontSizes.xs }}>Estornado</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: FontSizes.sm, 
                            fontWeight: 600, 
                            color: sale.isRefunded ? Colors.danger : creditAmount > 0 && !fullyPaid ? Colors.warning : Colors.success,
                            textDecoration: sale.isRefunded || fullyPaid ? 'line-through' : 'none',
                          }}>
                            {formatPrice(sale.total)}
                          </span>
                          {fullyPaid && <div style={{ fontSize: FontSizes.xs, color: Colors.success }}>Pago: {formatPrice(sale.total)}</div>}
                        </div>
                      </div>
                      <div style={{ fontSize: FontSizes.xs, color: Colors.text, marginTop: 4 }}>
                        {sale.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}
                      </div>
                    </button>
                  );})}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected History Sale Receipt */}
      {selectedHistorySale && (
        <ReceiptModal
          apiClient={apiClient}
          sale={selectedHistorySale}
          onClose={() => setSelectedHistorySale(null)}
          onRefund={handleRefund}
          showRefundOption={!selectedHistorySale.isRefunded}
        />
      )}
    </div>
  );
};
