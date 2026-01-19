import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Customer,
  PaymentPart,
  PaymentMethod,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface PaymentRegistrationModalProps {
  apiClient: ApiClient;
  customer: Customer;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PaymentRegistrationModal: React.FC<PaymentRegistrationModalProps> = ({
  apiClient,
  customer,
  balance,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [paymentAmount, setPaymentAmount] = useState<string>(balance.toFixed(2));
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [useMixedPayment, setUseMixedPayment] = useState(false);
  const [mixedPayments, setMixedPayments] = useState<PaymentPart[]>([]);
  const [mixedMethod, setMixedMethod] = useState<PaymentMethod>('cash');
  const [mixedAmount, setMixedAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerApiService(apiClient);

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: t('payment.cash') },
    { value: 'card', label: t('payment.card') },
    { value: 'transfer', label: t('payment.transfer') },
  ];

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  const parsedAmount = parseFloat(paymentAmount) || 0;
  const mixedTotal = mixedPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingForMixed = parsedAmount - mixedTotal;

  const handleAddMixedPayment = () => {
    const amount = parseFloat(mixedAmount) || 0;
    if (amount <= 0) {
      setError(t('errors.invalidAmount'));
      return;
    }
    if (amount > remainingForMixed) {
      setError(t('errors.exceedsRemaining'));
      return;
    }
    setMixedPayments([...mixedPayments, { method: mixedMethod, amount }]);
    setMixedAmount('');
    setError(null);
  };

  const handleRemoveMixedPayment = (index: number) => {
    setMixedPayments(mixedPayments.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (parsedAmount <= 0) {
      setError(t('errors.invalidAmount'));
      return;
    }
    if (parsedAmount > balance) {
      setError(t('errors.exceedsPending'));
      return;
    }

    let payments: PaymentPart[];
    if (useMixedPayment) {
      if (mixedTotal !== parsedAmount) {
        setError(t('errors.sumMustMatch'));
        return;
      }
      payments = mixedPayments;
    } else {
      payments = [{ method: selectedMethod, amount: parsedAmount }];
    }

    try {
      setLoading(true);
      setError(null);
      await customerService.registerPayment(customer.id, payments);
      onConfirm();
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to register payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFullBalance = () => {
    setPaymentAmount(balance.toFixed(2));
  };

  return (
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
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: Colors.background,
          borderRadius: BorderRadius.lg,
          width: '90%',
          maxWidth: 500,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: Spacing.md,
          borderBottom: `1px solid ${Colors.border}`,
        }}>
          <h3 style={{ margin: 0, fontSize: FontSizes.lg, fontWeight: 600 }}>
            {t('customers.registerPayment')}
          </h3>
          <button
            onClick={onCancel}
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

        {/* Content */}
        <div style={{ padding: Spacing.md }}>
          {/* Customer Info */}
          <div style={{
            padding: Spacing.md,
            backgroundColor: Colors.backgroundSecondary,
            borderRadius: BorderRadius.md,
            marginBottom: Spacing.md,
          }}>
            <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>
              {t('receipt.customer')}
            </div>
            <div style={{ fontSize: FontSizes.lg, fontWeight: 600, color: Colors.text }}>
              {customer.name}
            </div>
            <div style={{
              marginTop: Spacing.sm,
              fontSize: FontSizes.sm,
              color: Colors.textSecondary,
            }}>
              {t('customers.pendingBalance')}: <strong style={{ color: Colors.warning }}>{formatPrice(balance)}</strong>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: Spacing.sm,
              marginBottom: Spacing.md,
              backgroundColor: Colors.danger,
              color: Colors.textLight,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.sm,
            }}>
              {error}
            </div>
          )}

          {/* Payment Amount */}
          <div style={{ marginBottom: Spacing.md }}>
            <label style={{
              display: 'block',
              marginBottom: Spacing.xs,
              fontSize: FontSizes.sm,
              fontWeight: 500,
              color: Colors.text,
            }}>
              {t('payment.amount')}
            </label>
            <div style={{ display: 'flex', gap: Spacing.sm }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{
                  position: 'absolute',
                  left: Spacing.sm,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: Colors.textSecondary,
                }}>
                  €
                </span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01"
                  max={balance}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: Spacing.sm,
                    paddingLeft: Spacing.lg,
                    fontSize: FontSizes.lg,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.md,
                    outline: 'none',
                  }}
                />
              </div>
              <button
                onClick={handlePayFullBalance}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  backgroundColor: Colors.secondary,
                  color: Colors.textLight,
                  border: 'none',
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.sm,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('customers.payAll')}
              </button>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div style={{ marginBottom: Spacing.md }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: Spacing.sm,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={useMixedPayment}
                onChange={(e) => {
                  setUseMixedPayment(e.target.checked);
                  setMixedPayments([]);
                }}
              />
              <span style={{ fontSize: FontSizes.sm, color: Colors.text }}>
                {t('payment.mixed')}
              </span>
            </label>
          </div>

          {/* Single Payment Method */}
          {!useMixedPayment && (
            <div style={{ marginBottom: Spacing.md }}>
              <label style={{
                display: 'block',
                marginBottom: Spacing.xs,
                fontSize: FontSizes.sm,
                fontWeight: 500,
                color: Colors.text,
              }}>
                {t('payment.selectMethod')}
              </label>
              <div style={{ display: 'flex', gap: Spacing.sm }}>
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedMethod(method.value)}
                    style={{
                      flex: 1,
                      padding: Spacing.md,
                      backgroundColor: selectedMethod === method.value 
                        ? Colors.primary 
                        : Colors.background,
                      color: selectedMethod === method.value 
                        ? Colors.textLight 
                        : Colors.text,
                      border: `1px solid ${selectedMethod === method.value ? Colors.primary : Colors.border}`,
                      borderRadius: BorderRadius.md,
                      fontSize: FontSizes.sm,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mixed Payment */}
          {useMixedPayment && (
            <div style={{ marginBottom: Spacing.md }}>
              {/* Added Payments */}
              {mixedPayments.length > 0 && (
                <div style={{ marginBottom: Spacing.md }}>
                  {mixedPayments.map((payment, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: Spacing.sm,
                        backgroundColor: Colors.backgroundSecondary,
                        borderRadius: BorderRadius.md,
                        marginBottom: Spacing.xs,
                      }}
                    >
                      <span style={{ fontSize: FontSizes.sm }}>
                        {paymentMethods.find(m => m.value === payment.method)?.label}: {formatPrice(payment.amount)}
                      </span>
                      <button
                        onClick={() => handleRemoveMixedPayment(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: Colors.danger,
                          cursor: 'pointer',
                          fontSize: FontSizes.md,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div style={{
                    fontSize: FontSizes.sm,
                    color: remainingForMixed > 0 ? Colors.warning : Colors.success,
                    marginTop: Spacing.sm,
                  }}>
                    {remainingForMixed > 0 
                      ? `${t('payment.remaining')}: ${formatPrice(remainingForMixed)}`
                      : t('customers.valueComplete')}
                  </div>
                </div>
              )}

              {/* Add Payment Form */}
              {remainingForMixed > 0 && (
                <div style={{
                  display: 'flex',
                  gap: Spacing.sm,
                  alignItems: 'flex-end',
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: Spacing.xs,
                      fontSize: FontSizes.xs,
                      color: Colors.textSecondary,
                    }}>
                      {t('customers.method')}
                    </label>
                    <select
                      value={mixedMethod}
                      onChange={(e) => setMixedMethod(e.target.value as PaymentMethod)}
                      style={{
                        width: '100%',
                        padding: Spacing.sm,
                        fontSize: FontSizes.sm,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.md,
                      }}
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      marginBottom: Spacing.xs,
                      fontSize: FontSizes.xs,
                      color: Colors.textSecondary,
                    }}>
                      {t('payment.amount')}
                    </label>
                    <input
                      type="number"
                      value={mixedAmount}
                      onChange={(e) => setMixedAmount(e.target.value)}
                      placeholder={formatPrice(remainingForMixed)}
                      min="0.01"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: Spacing.sm,
                        fontSize: FontSizes.sm,
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.md,
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAddMixedPayment}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: Colors.secondary,
                      color: Colors.textLight,
                      border: 'none',
                      borderRadius: BorderRadius.md,
                      fontSize: FontSizes.sm,
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: Spacing.sm,
          padding: Spacing.md,
          borderTop: `1px solid ${Colors.border}`,
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: Spacing.md,
              backgroundColor: Colors.backgroundSecondary,
              color: Colors.text,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || parsedAmount <= 0 || (useMixedPayment && mixedTotal !== parsedAmount)}
            style={{
              flex: 2,
              padding: Spacing.md,
              backgroundColor: Colors.success,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || parsedAmount <= 0 || (useMixedPayment && mixedTotal !== parsedAmount) ? 0.7 : 1,
            }}
          >
            {loading ? t('common.loading') : `${t('common.confirm')} ${formatPrice(parsedAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
};
