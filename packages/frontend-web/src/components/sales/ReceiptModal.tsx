import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Receipt,
  Sale,
  ApiClient,
  SalesApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  getModalStyles,
} from '@cantina-pos/shared';

interface ReceiptModalProps {
  apiClient: ApiClient;
  sale: Sale;
  onClose: () => void;
  onRefund?: (sale: Sale) => void;
  showRefundOption?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  apiClient,
  sale,
  onClose,
  onRefund,
  showRefundOption = false,
}) => {
  const { t } = useTranslation();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const salesService = new SalesApiService(apiClient);
  const modalStyles = getModalStyles();

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentLabel = (method: string): string => {
    return method === 'credit' ? t('payment.creditRecorded') : t(`payment.${method}`);
  };

  // Load receipt data
  useEffect(() => {
    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const receiptData = await salesService.getReceipt(sale.id);
        setReceipt(receiptData);
      } catch (err) {
        setError(t('errors.loadFailed'));
        console.error('Failed to load receipt:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [sale.id, t]);

  // Handle refund
  const handleRefund = useCallback(async () => {
    if (!refundReason.trim()) {
      setError(t('errors.reasonRequired'));
      return;
    }

    try {
      setRefunding(true);
      setError(null);
      await salesService.refundSale(sale.id, refundReason.trim());
      onRefund?.(sale);
      onClose();
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to refund sale:', err);
    } finally {
      setRefunding(false);
    }
  }, [sale, refundReason, onRefund, onClose, t]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div
        style={{ ...modalStyles.container, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>
            {sale.isRefunded ? t('receipt.refundedSale') : t('receipt.title')}
          </h3>
          <button onClick={onClose} style={modalStyles.closeButton}>
            ×
          </button>
        </div>

        <div style={modalStyles.content}>
          {error && (
            <div style={{
              padding: Spacing.sm,
              backgroundColor: Colors.danger,
              color: Colors.textLight,
              borderRadius: BorderRadius.sm,
              marginBottom: Spacing.md,
              fontSize: FontSizes.sm,
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
              {t('common.loading')}
            </div>
          ) : receipt ? (
            <div style={{
              fontFamily: 'monospace',
              fontSize: FontSizes.sm,
            }}>
              {/* Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: Spacing.md,
                paddingBottom: Spacing.md,
                borderBottom: `1px dashed ${Colors.border}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: FontSizes.md }}>
                  CANTINA ADVM
                </div>
                <div style={{ color: Colors.textSecondary }}>
                  {receipt.eventName}
                </div>
                <div style={{ color: Colors.textSecondary, marginTop: Spacing.xs }}>
                  {formatDate(receipt.createdAt)}
                </div>
              </div>

              {/* Refunded Badge */}
              {sale.isRefunded && (
                <div style={{
                  textAlign: 'center',
                  padding: Spacing.sm,
                  backgroundColor: Colors.danger,
                  color: Colors.textLight,
                  borderRadius: BorderRadius.sm,
                  marginBottom: Spacing.md,
                  fontWeight: 700,
                }}>
                  {t('sales.refunded')}
                </div>
              )}

              {/* Items */}
              <div style={{ marginBottom: Spacing.md }}>
                {receipt.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: Spacing.xs,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div>{item.description}</div>
                      <div style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatPrice(item.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{
                borderTop: `1px dashed ${Colors.border}`,
                marginBottom: Spacing.md,
              }} />

              {/* Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: FontSizes.md,
                marginBottom: Spacing.md,
              }}>
                <span>{t('common.total').toUpperCase()}</span>
                <span>{formatPrice(receipt.total)}</span>
              </div>

              {/* Payment Methods */}
              <div style={{
                marginBottom: Spacing.md,
                paddingTop: Spacing.sm,
                borderTop: `1px dashed ${Colors.border}`,
              }}>
                <div style={{ fontWeight: 600, marginBottom: Spacing.xs }}>
                  {t('receipt.payment')}:
                </div>
                {receipt.payments.map((payment, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: Colors.textSecondary,
                    }}
                  >
                    <span>{getPaymentLabel(payment.method)}</span>
                    <span>{formatPrice(payment.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Customer (if credit sale) */}
              {receipt.customerName && (
                <div style={{
                  marginBottom: Spacing.md,
                  padding: Spacing.sm,
                  backgroundColor: Colors.backgroundSecondary,
                  borderRadius: BorderRadius.sm,
                }}>
                  <div style={{ fontWeight: 600 }}>{t('receipt.customer')}:</div>
                  <div>{receipt.customerName}</div>
                  {!sale.isPaid && (
                    <div style={{ color: Colors.warning, marginTop: Spacing.xs }}>
                      {t('receipt.paymentPending')}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{
                textAlign: 'center',
                paddingTop: Spacing.md,
                borderTop: `1px dashed ${Colors.border}`,
                color: Colors.textSecondary,
                fontSize: FontSizes.xs,
              }}>
                <div>{t('receipt.seller')}: {receipt.createdBy}</div>
                <div>ID: {sale.id.slice(0, 8)}</div>
                <div style={{ marginTop: Spacing.sm }}>
                  {t('receipt.thankYou')}
                </div>
              </div>
            </div>
          ) : null}

          {/* Refund Section */}
          {showRefundOption && !sale.isRefunded && !showRefundConfirm && (
            <button
              onClick={() => setShowRefundConfirm(true)}
              style={{
                width: '100%',
                marginTop: Spacing.md,
                padding: Spacing.sm,
                backgroundColor: 'transparent',
                color: Colors.danger,
                border: `1px solid ${Colors.danger}`,
                borderRadius: BorderRadius.md,
                cursor: 'pointer',
                fontSize: FontSizes.sm,
              }}
            >
              {t('sales.refund')}
            </button>
          )}

          {/* Refund Confirmation */}
          {showRefundConfirm && (
            <div style={{
              marginTop: Spacing.md,
              padding: Spacing.md,
              backgroundColor: Colors.backgroundSecondary,
              borderRadius: BorderRadius.md,
            }}>
              <div style={{
                fontWeight: 600,
                marginBottom: Spacing.sm,
                color: Colors.danger,
              }}>
                {t('sales.confirmRefund')}
              </div>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('sales.refundReason')}
                style={{
                  width: '100%',
                  padding: Spacing.sm,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.sm,
                  marginBottom: Spacing.sm,
                  fontSize: FontSizes.sm,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: Spacing.sm }}>
                <button
                  onClick={() => {
                    setShowRefundConfirm(false);
                    setRefundReason('');
                  }}
                  style={{
                    flex: 1,
                    padding: Spacing.sm,
                    backgroundColor: Colors.background,
                    color: Colors.text,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.sm,
                    cursor: 'pointer',
                    fontSize: FontSizes.sm,
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refunding || !refundReason.trim()}
                  style={{
                    flex: 1,
                    padding: Spacing.sm,
                    backgroundColor: Colors.danger,
                    color: Colors.textLight,
                    border: 'none',
                    borderRadius: BorderRadius.sm,
                    cursor: refunding || !refundReason.trim() ? 'not-allowed' : 'pointer',
                    opacity: refunding || !refundReason.trim() ? 0.6 : 1,
                    fontSize: FontSizes.sm,
                  }}
                >
                  {refunding ? t('common.loading') : t('sales.confirmRefund')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
