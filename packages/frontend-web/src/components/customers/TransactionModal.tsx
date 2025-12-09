import React, { useState } from 'react';
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

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'card', label: 'Cartão' },
  { value: 'transfer', label: 'Transferência' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  apiClient,
  customer,
  type,
  maxAmount,
  onConfirm,
  onCancel,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerApiService(apiClient);
  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;
  const parsedAmount = parseFloat(amount) || 0;

  const handleConfirm = async () => {
    if (parsedAmount <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }
    if (maxAmount && parsedAmount > maxAmount) {
      setError(`Valor não pode exceder ${formatPrice(maxAmount)}`);
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
      setError(err.message || 'Erro ao processar transação');
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'deposit' ? 'Depositar Crédito' : 'Devolver Dinheiro';
  const buttonText = type === 'deposit' ? 'Depositar' : 'Devolver';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onCancel}>
      <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, width: '90%', maxWidth: 400, padding: Spacing.lg }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: Spacing.md, fontSize: FontSizes.lg, fontWeight: 600 }}>{title}</h3>
        
        <div style={{ marginBottom: Spacing.md, padding: Spacing.md, backgroundColor: Colors.backgroundSecondary, borderRadius: BorderRadius.md }}>
          <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>Cliente</div>
          <div style={{ fontSize: FontSizes.md, fontWeight: 600 }}>{customer.name}</div>
        </div>

        {error && (
          <div style={{ padding: Spacing.sm, marginBottom: Spacing.md, backgroundColor: Colors.danger, color: Colors.textLight, borderRadius: BorderRadius.md, fontSize: FontSizes.sm }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: Spacing.md }}>
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.sm, fontWeight: 500 }}>Valor</label>
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
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.sm, fontWeight: 500 }}>Método</label>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            {PAYMENT_METHODS.map((m) => (
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
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || parsedAmount <= 0}
            style={{ flex: 2, padding: Spacing.md, backgroundColor: type === 'deposit' ? Colors.success : Colors.warning, color: type === 'deposit' ? Colors.textLight : Colors.text, border: 'none', borderRadius: BorderRadius.md, fontSize: FontSizes.md, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || parsedAmount <= 0 ? 0.7 : 1 }}
          >
            {loading ? 'A processar...' : `${buttonText} ${parsedAmount > 0 ? formatPrice(parsedAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};
