import React, { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  CustomerTransaction,
  EventCategory,
  ApiClient,
  CustomerApiService,
  EventCategoryApiService,
  SalesApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  PaymentMethod,
  Receipt,
} from '@cantina-pos/shared';

interface CustomerHistoryProps {
  apiClient: ApiClient;
  customer: Customer;
  onDeposit: () => void;
  onWithdraw: () => void;
  onBack: () => void;
}

export const CustomerHistory: React.FC<CustomerHistoryProps> = ({
  apiClient,
  customer,
  onDeposit,
  onWithdraw,
  onBack,
}) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'purchases'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const customerService = new CustomerApiService(apiClient);
  const categoryService = new EventCategoryApiService(apiClient);
  const salesService = new SalesApiService(apiClient);

  const loadCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filter = {
        categoryId: categoryFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const history = await customerService.getCustomerHistory(customer.id, filter);
      setBalance(history.balance);
      setTransactions(history.transactions);
    } catch (err) {
      setError('Erro ao carregar dados do cliente');
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [customer.id, categoryFilter, startDate, endDate]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleViewReceipt = async (saleId: string) => {
    try {
      const receipt = await salesService.getReceipt(saleId);
      setSelectedReceipt(receipt);
    } catch (err) {
      console.error('Failed to load receipt:', err);
    }
  };

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

  const translateMethod = (method?: PaymentMethod): string => {
    const map: Record<PaymentMethod, string> = {
      cash: 'Dinheiro', card: 'Cartão', transfer: 'Transferência', balance: 'Saldo', credit: 'Fiado'
    };
    return method ? map[method] || method : '';
  };

  const translateType = (type: CustomerTransaction['type']): string => {
    const map = { deposit: 'Depósito', withdrawal: 'Devolução', purchase: 'Compra', refund: 'Estorno' };
    return map[type];
  };

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => 
        activeTab === 'deposits' 
          ? t.type === 'deposit' || t.type === 'withdrawal'
          : t.type === 'purchase' || t.type === 'refund'
      );

  if (loading && transactions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: Colors.textSecondary }}>
        A carregar...
      </div>
    );
  }

  const creditLimit = (customer as any).creditLimit || 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: Spacing.md, backgroundColor: Colors.background, borderBottom: `1px solid ${Colors.border}` }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: Colors.primary, cursor: 'pointer', fontSize: FontSizes.sm, padding: 0, marginBottom: Spacing.sm }}>
          ← Voltar à pesquisa
        </button>
        <h2 style={{ margin: 0, fontSize: FontSizes.xl, fontWeight: 600, color: Colors.text }}>{customer.name}</h2>
        <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.sm, color: Colors.textSecondary }}>
          Limite de crédito: {formatPrice(creditLimit)}
        </p>
      </div>

      {error && (
        <div style={{ padding: Spacing.sm, margin: Spacing.md, backgroundColor: Colors.danger, color: Colors.textLight, borderRadius: BorderRadius.md, fontSize: FontSizes.sm }}>
          {error}
        </div>
      )}

      {/* Balance Card */}
      <div style={{
        margin: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: balance >= 0 ? Colors.success : Colors.warning,
        borderRadius: BorderRadius.lg,
        color: balance >= 0 ? Colors.textLight : Colors.text,
      }}>
        <div style={{ fontSize: FontSizes.sm, opacity: 0.8 }}>
          {balance >= 0 ? 'Saldo Disponível' : 'Saldo Devedor'}
        </div>
        <div style={{ fontSize: FontSizes.xl, fontWeight: 700, marginTop: Spacing.xs }}>
          {formatPrice(Math.abs(balance))}
        </div>
        <div style={{ display: 'flex', gap: Spacing.sm, marginTop: Spacing.md }}>
          <button onClick={onDeposit} style={{
            padding: `${Spacing.sm}px ${Spacing.lg}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.md,
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            Depositar
          </button>
          {balance > 0 && (
            <button onClick={onWithdraw} style={{
              padding: `${Spacing.sm}px ${Spacing.lg}px`,
              backgroundColor: Colors.background,
              color: Colors.text,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Devolver
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: Spacing.sm, 
        padding: `0 ${Spacing.md}px`,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: `${Spacing.xs}px ${Spacing.sm}px`,
            borderRadius: BorderRadius.sm,
            border: `1px solid ${Colors.border}`,
            fontSize: FontSizes.sm,
            minWidth: 120,
          }}
        >
          <option value="">Todas categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Data início"
          style={{
            padding: `${Spacing.xs}px ${Spacing.sm}px`,
            borderRadius: BorderRadius.sm,
            border: `1px solid ${Colors.border}`,
            fontSize: FontSizes.sm,
          }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Data fim"
          style={{
            padding: `${Spacing.xs}px ${Spacing.sm}px`,
            borderRadius: BorderRadius.sm,
            border: `1px solid ${Colors.border}`,
            fontSize: FontSizes.sm,
          }}
        />
        {(categoryFilter || startDate || endDate) && (
          <button
            onClick={() => { setCategoryFilter(''); setStartDate(''); setEndDate(''); }}
            style={{
              padding: `${Spacing.xs}px ${Spacing.sm}px`,
              backgroundColor: Colors.backgroundSecondary,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.sm,
              fontSize: FontSizes.sm,
              cursor: 'pointer',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: Spacing.xs, padding: `${Spacing.sm}px ${Spacing.md}px`, borderBottom: `1px solid ${Colors.border}` }}>
        {(['all', 'deposits', 'purchases'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: 'transparent',
              color: activeTab === tab ? Colors.primary : Colors.textSecondary,
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${Colors.primary}` : '2px solid transparent',
              fontSize: FontSizes.sm,
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab === 'all' ? 'Tudo' : tab === 'deposits' ? 'Depósitos' : 'Compras'}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: Spacing.md }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
            Nenhum registo encontrado
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {filteredTransactions.map((tx) => (
              <div 
                key={tx.id} 
                onClick={() => tx.saleId && handleViewReceipt(tx.saleId)}
                style={{ 
                  padding: Spacing.md, 
                  backgroundColor: Colors.background, 
                  border: `1px solid ${Colors.border}`, 
                  borderRadius: BorderRadius.md,
                  cursor: tx.saleId ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: `2px ${Spacing.xs}px`,
                      backgroundColor: tx.type === 'deposit' || tx.type === 'refund' ? Colors.success : Colors.warning,
                      color: tx.type === 'deposit' || tx.type === 'refund' ? Colors.textLight : Colors.text,
                      borderRadius: BorderRadius.sm,
                      fontSize: FontSizes.xs,
                      fontWeight: 500,
                      marginBottom: Spacing.xs,
                    }}>
                      {translateType(tx.type)}
                    </span>
                    {tx.categoryName && (
                      <span style={{
                        display: 'inline-block',
                        padding: `2px ${Spacing.xs}px`,
                        backgroundColor: Colors.backgroundSecondary,
                        color: Colors.text,
                        borderRadius: BorderRadius.sm,
                        fontSize: FontSizes.xs,
                        marginLeft: Spacing.xs,
                      }}>
                        {tx.categoryName}
                      </span>
                    )}
                    <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 }}>
                      {formatDate(tx.createdAt)}
                    </div>
                    {tx.eventName && (
                      <div style={{ fontSize: FontSizes.sm, color: Colors.text, marginTop: 2 }}>
                        {tx.eventName}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: FontSizes.lg,
                      fontWeight: 600,
                      color: tx.type === 'deposit' || tx.type === 'refund' ? Colors.success : Colors.danger,
                    }}>
                      {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}{formatPrice(tx.amount)}
                    </div>
                    {tx.type === 'purchase' && tx.amountPaid < tx.amount && (
                      <div style={{ fontSize: FontSizes.xs, color: Colors.warning }}>
                        Pago: {formatPrice(tx.amountPaid)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Items list for purchases */}
                {tx.items && tx.items.length > 0 && (
                  <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: Spacing.xs }}>
                    {tx.items.map((item, idx) => (
                      <span key={idx}>
                        {idx > 0 && ', '}
                        {item.quantity}x {item.description}
                      </span>
                    ))}
                  </div>
                )}
                
                {!tx.items && tx.description && (
                  <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary }}>
                    {tx.description}{tx.paymentMethod ? ` (${translateMethod(tx.paymentMethod)})` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }} onClick={() => setSelectedReceipt(null)}>
          <div style={{
            backgroundColor: Colors.background,
            borderRadius: BorderRadius.lg,
            padding: Spacing.lg,
            maxWidth: 400,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, marginBottom: Spacing.md }}>Recibo</h3>
            <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              {selectedReceipt.eventName} • {formatDate(selectedReceipt.createdAt)}
            </div>
            <div style={{ borderTop: `1px solid ${Colors.border}`, paddingTop: Spacing.sm }}>
              {selectedReceipt.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
                  <span>{item.quantity}x {item.description}</span>
                  <span>{formatPrice(item.total)}</span>
                </div>
              ))}
            </div>
            <div style={{ 
              borderTop: `1px solid ${Colors.border}`, 
              paddingTop: Spacing.sm, 
              marginTop: Spacing.sm,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Total</span>
              <span>{formatPrice(selectedReceipt.total)}</span>
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              style={{
                width: '100%',
                marginTop: Spacing.md,
                padding: Spacing.sm,
                backgroundColor: Colors.primary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
