import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Customer,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface CustomerWithBalance extends Customer {
  balance?: number;
}

interface CustomerSearchProps {
  apiClient: ApiClient;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer?: (name: string, initialBalance?: number) => Promise<Customer>;
}

type FilterType = 'all' | 'withBalance' | 'noBalance';
type SortType = 'name-asc' | 'name-desc' | 'balance-desc' | 'recent';

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  apiClient,
  onSelectCustomer,
  onCreateCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newInitialBalanceStr, setNewInitialBalanceStr] = useState('0');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name-asc');
  const searchTimeout = useRef<NodeJS.Timeout>();

  const customerService = new CustomerApiService(apiClient);

  // Load all customers on mount and fetch balances
  const loadCustomers = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const results = query.trim() 
        ? await customerService.searchCustomers(query)
        : await customerService.searchCustomers('');
      
      // Fetch balances for all customers
      const customersWithBalances = await Promise.all(
        results.map(async (customer) => {
          try {
            const balance = await customerService.getCustomerBalance(customer.id);
            return { ...customer, balance };
          } catch {
            return { ...customer, balance: 0 };
          }
        })
      );
      
      setCustomers(customersWithBalances);
    } catch (err) {
      setError('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadCustomers(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Filter and sort customers
  const filteredCustomers = customers
    .filter(c => {
      if (filter === 'withBalance') return (c.balance || 0) < 0; // em dívida
      if (filter === 'noBalance') return (c.balance || 0) >= 0;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'balance-desc': return (a.balance || 0) - (b.balance || 0); // mais negativo primeiro
        case 'recent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: return a.name.localeCompare(b.name);
      }
    });

  const customersWithDebt = customers.filter(c => (c.balance || 0) < 0).length;

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      setCreating(true);
      const initialBalance = parseFloat(newInitialBalanceStr) || 0;
      const customer = onCreateCustomer 
        ? await onCreateCustomer(newCustomerName.trim(), initialBalance)
        : await customerService.createCustomer(newCustomerName.trim(), undefined, initialBalance);
      setShowCreateModal(false);
      setNewCustomerName('');
      setNewInitialBalanceStr('0');
      onSelectCustomer(customer);
    } catch {
      setError('Erro ao criar cliente');
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const selectStyle: React.CSSProperties = {
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    border: `1px solid ${Colors.border}`,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    cursor: 'pointer',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Search and Create Button */}
      <div style={{ padding: Spacing.md, backgroundColor: Colors.background, borderBottom: `1px solid ${Colors.border}` }}>
        <div style={{ display: 'flex', gap: Spacing.sm, marginBottom: Spacing.md }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar clientes..."
              style={{
                width: '100%',
                padding: `${Spacing.sm}px ${Spacing.sm}px ${Spacing.sm}px 40px`,
                fontSize: FontSizes.md,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: Colors.primary,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.md,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Novo Cliente
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)} style={selectStyle}>
            <option value="all">Todos ({customers.length})</option>
            <option value="withBalance">Em dívida ({customersWithDebt})</option>
            <option value="noBalance">Sem dívida ({customers.length - customersWithDebt})</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortType)} style={selectStyle}>
            <option value="name-asc">Nome A-Z</option>
            <option value="name-desc">Nome Z-A</option>
            <option value="balance-desc">Maior dívida</option>
            <option value="recent">Mais recente</option>
          </select>
          {customersWithDebt > 0 && (
            <span style={{ 
              padding: `${Spacing.xs}px ${Spacing.sm}px`, 
              backgroundColor: Colors.warning, 
              color: '#000',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.xs,
              fontWeight: 600,
            }}>
              ⚠️ {customersWithDebt} em dívida
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: Spacing.sm, backgroundColor: Colors.danger, color: Colors.textLight, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Customer List */}
      <div style={{ flex: 1, overflow: 'auto', padding: Spacing.md }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
            A carregar...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
            <p style={{ fontSize: 48, margin: 0 }}>👥</p>
            <p style={{ margin: `${Spacing.md}px 0 0` }}>
              {searchQuery ? 'Nenhum cliente encontrado' : 'Nenhum cliente registado'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                marginTop: Spacing.md,
                padding: `${Spacing.sm}px ${Spacing.lg}px`,
                backgroundColor: Colors.primary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                cursor: 'pointer',
              }}
            >
              Criar primeiro cliente
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: Spacing.md,
                  padding: Spacing.md,
                  backgroundColor: Colors.background,
                  borderRadius: BorderRadius.md,
                  border: `1px solid ${Colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = Colors.primary;
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: (customer.balance || 0) < 0 ? Colors.warning : Colors.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#000',
                  fontSize: FontSizes.md,
                  flexShrink: 0,
                }}>
                  {getInitials(customer.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: Colors.text, fontSize: FontSizes.md }}>
                    {customer.name}
                  </div>
                  <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 }}>
                    Cliente desde {new Date(customer.createdAt).toLocaleDateString('pt-PT')}
                  </div>
                </div>

                {/* Balance */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: FontSizes.lg,
                    color: (customer.balance || 0) < 0 ? Colors.danger : Colors.success,
                  }}>
                    {formatCurrency(Math.abs(customer.balance || 0))}
                  </div>
                  <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                    {(customer.balance || 0) < 0 ? 'em dívida' : (customer.balance || 0) > 0 ? 'crédito' : 'sem saldo'}
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ color: Colors.textSecondary, fontSize: 20 }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              backgroundColor: Colors.background,
              borderRadius: BorderRadius.lg,
              padding: Spacing.lg,
              width: '90%',
              maxWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, marginBottom: Spacing.md, fontSize: FontSizes.lg }}>
              Novo Cliente
            </h3>
            <input
              type="text"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Nome do cliente"
              autoFocus
              style={{
                width: '100%',
                padding: Spacing.md,
                fontSize: FontSizes.md,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                marginBottom: Spacing.md,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ marginBottom: Spacing.md }}>
              <label style={{ display: 'block', fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.xs }}>
                Saldo inicial (opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={newInitialBalanceStr}
                onChange={(e) => setNewInitialBalanceStr(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: Spacing.md,
                  fontSize: FontSizes.md,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                Use valor negativo se o cliente já tinha dívida
              </p>
            </div>
            <div style={{ display: 'flex', gap: Spacing.sm, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreateModal(false); setNewInitialBalanceStr('0'); }}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.lg}px`,
                  backgroundColor: Colors.backgroundSecondary,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creating || !newCustomerName.trim()}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.lg}px`,
                  backgroundColor: Colors.primary,
                  color: Colors.textLight,
                  border: 'none',
                  borderRadius: BorderRadius.md,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating || !newCustomerName.trim() ? 0.6 : 1,
                }}
              >
                {creating ? 'A criar...' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
