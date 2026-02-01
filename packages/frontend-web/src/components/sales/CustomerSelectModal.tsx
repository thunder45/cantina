import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Customer,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  getModalStyles,
} from '@cantina-pos/shared';

interface CustomerWithBalance extends Customer {
  balance?: number;
}

interface CustomerSelectModalProps {
  apiClient: ApiClient;
  onSelect: (customer: Customer) => void;
  onCancel: () => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  apiClient,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const customerService = new CustomerApiService(apiClient);
  const modalStyles = getModalStyles();

  const loadCustomers = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const results = await customerService.searchCustomers(query);
      setCustomers(results);
    } catch {
      setError(t('errors.loadCustomers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadCustomers(searchQuery), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      setCreating(true);
      const customer = await customerService.createCustomer(newCustomerName.trim());
      onSelect(customer);
    } catch {
      setError(t('errors.createCustomer'));
      setCreating(false);
    }
  };

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div
        style={{ ...modalStyles.container, maxWidth: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ ...modalStyles.header, flexShrink: 0 }}>
          <h3 style={modalStyles.title}>{t('sales.selectCustomer')}</h3>
          <button onClick={onCancel} style={modalStyles.closeButton}>×</button>
        </div>

        {/* Search & Create Button */}
        <div style={{ padding: Spacing.md, borderBottom: `1px solid ${Colors.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('customers.searchCustomer')}
                autoFocus
                style={{
                  width: '100%',
                  padding: `${Spacing.sm}px ${Spacing.sm}px ${Spacing.sm}px 40px`,
                  fontSize: FontSizes.md,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: Colors.primary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.sm,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + {t('common.new')}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: Spacing.sm, backgroundColor: Colors.danger, color: Colors.textLight, textAlign: 'center', flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* Customer List */}
        <div style={{ flex: 1, overflow: 'auto', padding: Spacing.md }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
              {t('common.loading')}
            </div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: Spacing.xl, color: Colors.textSecondary }}>
              <p style={{ fontSize: 48, margin: 0 }}>👥</p>
              <p style={{ margin: `${Spacing.md}px 0 0` }}>
                {searchQuery ? t('customers.noCustomers') : t('customers.noCustomersRegistered')}
              </p>
              <button
                onClick={() => setShowCreate(true)}
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
                {t('customers.createFirst')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {customers.map(customer => {
                const balance = customer.balance || 0;
                const isPositive = balance >= 0;
                return (
                <div
                  key={customer.id}
                  onClick={() => onSelect(customer)}
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
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: isPositive ? Colors.success : Colors.warning,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: isPositive ? Colors.textLight : '#000',
                    fontSize: FontSizes.sm,
                    flexShrink: 0,
                  }}>
                    {getInitials(customer.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: Colors.text, fontSize: FontSizes.md }}>
                      {customer.name}
                    </div>
                    <div style={{ 
                      fontSize: FontSizes.xs, 
                      color: isPositive ? Colors.success : Colors.warning,
                      fontWeight: 500,
                    }}>
                      Saldo: {isPositive ? '+' : ''}{formatCurrency(balance)}
                    </div>
                  </div>

                  {/* Arrow */}
                  <span style={{ color: Colors.textSecondary, fontSize: 18 }}>→</span>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Create Customer Inline */}
        {showCreate && (
          <div style={{ 
            padding: Spacing.md, 
            borderTop: `1px solid ${Colors.border}`, 
            backgroundColor: Colors.backgroundSecondary,
            flexShrink: 0,
          }}>
            <div style={{ fontWeight: 600, marginBottom: Spacing.sm, fontSize: FontSizes.sm }}>
              {t('customers.newCustomer')}
            </div>
            <div style={{ display: 'flex', gap: Spacing.sm }}>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomer()}
                placeholder={t('customers.name')}
                autoFocus
                style={{
                  flex: 1,
                  padding: Spacing.sm,
                  fontSize: FontSizes.md,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                }}
              />
              <button
                onClick={() => { setShowCreate(false); setNewCustomerName(''); }}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  backgroundColor: Colors.background,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creating || !newCustomerName.trim()}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  backgroundColor: Colors.success,
                  color: Colors.textLight,
                  border: 'none',
                  borderRadius: BorderRadius.md,
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating || !newCustomerName.trim() ? 0.6 : 1,
                }}
              >
                {creating ? '...' : t('common.create')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
