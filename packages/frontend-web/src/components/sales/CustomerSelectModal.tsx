import React, { useState, useCallback } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerApiService(apiClient);
  const modalStyles = getModalStyles();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await customerService.searchCustomers(searchQuery);
      setCustomers(results);
    } catch (err) {
      setError('Erro ao pesquisar clientes');
      console.error('Failed to search customers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomerName.trim()) {
      setError('Nome do cliente é obrigatório');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const customer = await customerService.createCustomer(newCustomerName.trim());
      onSelect(customer);
    } catch (err) {
      setError('Erro ao criar cliente');
      console.error('Failed to create customer:', err);
    } finally {
      setCreating(false);
    }
  }, [newCustomerName, onSelect]);

  return (
    <div style={modalStyles.overlay} onClick={onCancel}>
      <div
        style={{ ...modalStyles.container, maxWidth: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Selecionar Cliente</h3>
          <button onClick={onCancel} style={modalStyles.closeButton}>
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

          {/* Search Section */}
          <div style={{ marginBottom: Spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: Spacing.xs,
              fontSize: FontSizes.sm,
              fontWeight: 500,
              color: Colors.text,
            }}>
              Pesquisar cliente existente
            </label>
            <div style={{ display: 'flex', gap: Spacing.sm }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Nome do cliente..."
                style={{
                  flex: 1,
                  padding: Spacing.sm,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.md,
                }}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  backgroundColor: Colors.primary,
                  color: Colors.textLight,
                  border: 'none',
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.md,
                  cursor: loading || !searchQuery.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !searchQuery.trim() ? 0.6 : 1,
                }}
              >
                {loading ? '...' : 'Pesquisar'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {customers.length > 0 && (
            <div style={{ marginBottom: Spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: Spacing.xs,
                fontSize: FontSizes.sm,
                fontWeight: 500,
                color: Colors.text,
              }}>
                Resultados ({customers.length})
              </label>
              <div style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
              }}>
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => onSelect(customer)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: Spacing.sm,
                      textAlign: 'left',
                      backgroundColor: Colors.background,
                      border: 'none',
                      borderBottom: `1px solid ${Colors.border}`,
                      cursor: 'pointer',
                      fontSize: FontSizes.md,
                      color: Colors.text,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.backgroundSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.background;
                    }}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Customer Section */}
          <div style={{
            padding: Spacing.md,
            backgroundColor: Colors.backgroundSecondary,
            borderRadius: BorderRadius.md,
          }}>
            <label style={{
              display: 'block',
              marginBottom: Spacing.xs,
              fontSize: FontSizes.sm,
              fontWeight: 500,
              color: Colors.text,
            }}>
              Ou criar novo cliente
            </label>
            <div style={{ display: 'flex', gap: Spacing.sm }}>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomer()}
                placeholder="Nome do novo cliente..."
                style={{
                  flex: 1,
                  padding: Spacing.sm,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.md,
                }}
              />
              <button
                onClick={handleCreateCustomer}
                disabled={creating || !newCustomerName.trim()}
                style={{
                  padding: `${Spacing.sm}px ${Spacing.md}px`,
                  backgroundColor: Colors.success,
                  color: Colors.textLight,
                  border: 'none',
                  borderRadius: BorderRadius.md,
                  fontSize: FontSizes.md,
                  cursor: creating || !newCustomerName.trim() ? 'not-allowed' : 'pointer',
                  opacity: creating || !newCustomerName.trim() ? 0.6 : 1,
                }}
              >
                {creating ? '...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
