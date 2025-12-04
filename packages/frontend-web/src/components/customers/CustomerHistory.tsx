import React, { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  Sale,
  CustomerPayment,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface CustomerHistoryProps {
  apiClient: ApiClient;
  customer: Customer;
  onRegisterPayment: () => void;
  onBack: () => void;
}

export const CustomerHistory: React.FC<CustomerHistoryProps> = ({
  apiClient,
  customer,
  onRegisterPayment,
  onBack,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'payments'>('all');

  const customerService = new CustomerApiService(apiClient);

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [balanceResult, historyResult] = await Promise.all([
        customerService.getCustomerBalance(customer.id),
        customerService.getCustomerHistory(customer.id),
      ]);
      setBalance(balanceResult);
      setSales(historyResult.sales);
      setPayments(historyResult.payments);
    } catch (err) {
      setError('Erro ao carregar dados do cliente');
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [customer.id]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethods = (payments: { method: string; amount: number }[]): string => {
    return payments.map(p => `${p.method}: ${formatPrice(p.amount)}`).join(', ');
  };

  // Combine and sort all transactions
  const allTransactions = [
    ...sales.map(s => ({ type: 'sale' as const, data: s, date: s.createdAt })),
    ...payments.map(p => ({ type: 'payment' as const, data: p, date: p.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = activeTab === 'all' 
    ? allTransactions 
    : allTransactions.filter(t => 
        activeTab === 'sales' ? t.type === 'sale' : t.type === 'payment'
      );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
        color: Colors.textSecondary,
      }}>
        A carregar...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: Colors.primary,
            cursor: 'pointer',
            fontSize: FontSizes.sm,
            padding: 0,
            marginBottom: Spacing.sm,
          }}
        >
          ← Voltar à pesquisa
        </button>
        <h2 style={{
          margin: 0,
          fontSize: FontSizes.xl,
          fontWeight: 600,
          color: Colors.text,
        }}>
          {customer.name}
        </h2>
        <p style={{
          margin: 0,
          marginTop: Spacing.xs,
          fontSize: FontSizes.sm,
          color: Colors.textSecondary,
        }}>
          Cliente desde {formatDate(customer.createdAt).split(',')[0]}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: Spacing.sm,
          margin: Spacing.md,
          backgroundColor: Colors.danger,
          color: Colors.textLight,
          borderRadius: BorderRadius.md,
          fontSize: FontSizes.sm,
        }}>
          {error}
        </div>
      )}

      {/* Balance Card */}
      <div style={{
        margin: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: balance > 0 ? Colors.warning : Colors.success,
        borderRadius: BorderRadius.lg,
        color: balance > 0 ? Colors.text : Colors.textLight,
      }}>
        <div style={{ fontSize: FontSizes.sm, opacity: 0.8 }}>
          Saldo Pendente
        </div>
        <div style={{
          fontSize: FontSizes.xl,
          fontWeight: 700,
          marginTop: Spacing.xs,
        }}>
          {formatPrice(balance)}
        </div>
        {balance > 0 && (
          <button
            onClick={onRegisterPayment}
            style={{
              marginTop: Spacing.md,
              padding: `${Spacing.sm}px ${Spacing.lg}px`,
              backgroundColor: Colors.primary,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Registar Pagamento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: Spacing.xs,
        padding: `0 ${Spacing.md}px`,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        {(['all', 'sales', 'payments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: 'transparent',
              color: activeTab === tab ? Colors.primary : Colors.textSecondary,
              border: 'none',
              borderBottom: activeTab === tab 
                ? `2px solid ${Colors.primary}` 
                : '2px solid transparent',
              fontSize: FontSizes.sm,
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab === 'all' ? 'Tudo' : tab === 'sales' ? `Compras (${sales.length})` : `Pagamentos (${payments.length})`}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: Spacing.md,
      }}>
        {filteredTransactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.xl,
            color: Colors.textSecondary,
          }}>
            Nenhum registo encontrado
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {filteredTransactions.map((transaction, index) => (
              <div
                key={`${transaction.type}-${index}`}
                style={{
                  padding: Spacing.md,
                  backgroundColor: Colors.background,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                }}
              >
                {transaction.type === 'sale' ? (
                  <SaleItem sale={transaction.data as Sale} formatPrice={formatPrice} formatDate={formatDate} />
                ) : (
                  <PaymentItem payment={transaction.data as CustomerPayment} formatPrice={formatPrice} formatDate={formatDate} formatPaymentMethods={formatPaymentMethods} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Sale Item Component
const SaleItem: React.FC<{
  sale: Sale;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
}> = ({ sale, formatPrice, formatDate }) => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    }}>
      <div>
        <span style={{
          display: 'inline-block',
          padding: `2px ${Spacing.xs}px`,
          backgroundColor: sale.isRefunded ? Colors.danger : sale.isPaid ? Colors.success : Colors.warning,
          color: sale.isRefunded || sale.isPaid ? Colors.textLight : Colors.text,
          borderRadius: BorderRadius.sm,
          fontSize: FontSizes.xs,
          fontWeight: 500,
          marginBottom: Spacing.xs,
        }}>
          {sale.isRefunded ? 'Estornado' : sale.isPaid ? 'Pago' : 'Pendente'}
        </span>
        <div style={{
          fontSize: FontSizes.xs,
          color: Colors.textSecondary,
        }}>
          {formatDate(sale.createdAt)}
        </div>
      </div>
      <div style={{
        fontSize: FontSizes.lg,
        fontWeight: 600,
        color: sale.isRefunded ? Colors.textSecondary : Colors.danger,
        textDecoration: sale.isRefunded ? 'line-through' : 'none',
      }}>
        -{formatPrice(sale.total)}
      </div>
    </div>
    <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>
      {sale.items.map(item => `${item.quantity}x ${item.description}`).join(', ')}
    </div>
  </div>
);

// Payment Item Component
const PaymentItem: React.FC<{
  payment: CustomerPayment;
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  formatPaymentMethods: (payments: { method: string; amount: number }[]) => string;
}> = ({ payment, formatPrice, formatDate, formatPaymentMethods }) => (
  <div>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    }}>
      <div>
        <span style={{
          display: 'inline-block',
          padding: `2px ${Spacing.xs}px`,
          backgroundColor: Colors.success,
          color: Colors.textLight,
          borderRadius: BorderRadius.sm,
          fontSize: FontSizes.xs,
          fontWeight: 500,
          marginBottom: Spacing.xs,
        }}>
          Pagamento
        </span>
        <div style={{
          fontSize: FontSizes.xs,
          color: Colors.textSecondary,
        }}>
          {formatDate(payment.createdAt)}
        </div>
      </div>
      <div style={{
        fontSize: FontSizes.lg,
        fontWeight: 600,
        color: Colors.success,
      }}>
        +{formatPrice(payment.totalAmount)}
      </div>
    </div>
    <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>
      {formatPaymentMethods(payment.payments)}
    </div>
  </div>
);
