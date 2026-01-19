import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Customer,
  PaymentMethod,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface TransactionModalProps {
  apiClient: ApiClient;
  customer: Customer;
  type: 'deposit' | 'withdraw';
  maxAmount?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  apiClient,
  customer,
  type,
  maxAmount,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerApiService(apiClient);
  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;
  const parsedAmount = parseFloat(amount) || 0;

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: t('payment.cash') },
    { value: 'card', label: t('payment.card') },
    { value: 'transfer', label: t('payment.transfer') },
  ];

  const handleConfirm = async () => {
    if (parsedAmount <= 0) {
      setError(t('errors.invalidAmount'));
      return;
    }
    if (maxAmount && parsedAmount > maxAmount) {
      setError(t('errors.maxAmount', { max: formatPrice(maxAmount) }));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (type === 'deposit') {
        await customerService.deposit(customer.id, parsedAmount, method);
      } else {
        await customerService.withdraw(customer.id, parsedAmount, method);
      }
      onConfirm();
    } catch (err: any) {
      setError(err.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'deposit' ? t('customers.depositCredit') : t('customers.returnMoney');
  const buttonText = type === 'deposit' ? t('customers.deposit') : t('customers.withdrawal');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onCancel}>
      <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, width: '90%', maxWidth: 400, padding: Spacing.lg }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: Spacing.md, fontSize: FontSizes.lg, fontWeight: 600 }}>{title}</h3>
        
        <div style={{ marginBottom: Spacing.md, padding: Spacing.md, backgroundColor: Colors.backgroundSecondary, borderRadius: BorderRadius.md }}>
          <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>{t('receipt.customer')}</div>
          <div style={{ fontSize: FontSizes.md, fontWeight: 600 }}>{customer.name}</div>
        </div>

        {error && (
          <div style={{ padding: Spacing.sm, marginBottom: Spacing.md, backgroundColor: Colors.danger, color: Colors.textLight, borderRadius: BorderRadius.md, fontSize: FontSizes.sm }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: Spacing.md }}>
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.sm, fontWeight: 500 }}>{t('payment.amount')}</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: Spacing.sm, top: '50%', transform: 'translateY(-50%)', color: Colors.textSecondary }}>€</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              autoFocus
              style={{ width: '100%', padding: Spacing.sm, paddingLeft: Spacing.lg, fontSize: FontSizes.lg, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: Spacing.lg }}>
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.sm, fontWeight: 500 }}>{t('customers.method')}</label>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            {paymentMethods.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                style={{
                  flex: 1,
                  padding: Spacing.sm,
                  backgroundColor: method === m.value ? Colors.primary : Colors.background,
                  color: method === m.value ? Colors.textLight : Colors.text,
                  border: `1px solid ${method === m.value ? Colors.primary : Colors.border}`,
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.sm,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: Spacing.sm }}>
          <button onClick={onCancel} style={{ flex: 1, padding: Spacing.md, backgroundColor: Colors.backgroundSecondary, color: Colors.text, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, fontSize: FontSizes.md, cursor: 'pointer' }}>
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || parsedAmount <= 0}
            style={{ flex: 2, padding: Spacing.md, backgroundColor: type === 'deposit' ? Colors.success : Colors.warning, color: type === 'deposit' ? Colors.textLight : Colors.text, border: 'none', borderRadius: BorderRadius.md, fontSize: FontSizes.md, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || parsedAmount <= 0 ? 0.7 : 1 }}
          >
            {loading ? t('common.loading') : `${buttonText} ${parsedAmount > 0 ? formatPrice(parsedAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
