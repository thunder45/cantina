import React, { useState, useCallback } from 'react';
import {
  Customer,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface CustomerSearchProps {
  apiClient: ApiClient;
  onSelectCustomer: (customer: Customer) => void;
  onCreateCustomer?: (name: string) => Promise<Customer>;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  apiClient,
  onSelectCustomer,
  onCreateCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService = new CustomerApiService(apiClient);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      setError('Nome do cliente não pode estar vazio');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      let customer: Customer;
      if (onCreateCustomer) {
        customer = await onCreateCustomer(newCustomerName.trim());
      } else {
        customer = await customerService.createCustomer(newCustomerName.trim());
      }
      setShowCreateForm(false);
      setNewCustomerName('');
      onSelectCustomer(customer);
    } catch (err) {
      setError('Erro ao criar cliente');
      console.error('Failed to create customer:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: Spacing.md }}>
      {/* Search Input */}
      <div style={{ display: 'flex', gap: Spacing.sm, marginBottom: Spacing.md }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Pesquisar cliente por nome..."
          style={{
            flex: 1,
            padding: Spacing.sm,
            fontSize: FontSizes.md,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.md,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: `${Spacing.sm}px ${Spacing.md}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.md,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'A pesquisar...' : 'Pesquisar'}
        </button>
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

      {/* Results */}
      <div style={{ marginBottom: Spacing.md }}>
        {customers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: Spacing.md,
                  backgroundColor: Colors.background,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{
                    fontSize: FontSizes.md,
                    fontWeight: 500,
                    color: Colors.text,
                  }}>
                    {customer.name}
                  </div>
                  <div style={{
                    fontSize: FontSizes.xs,
                    color: Colors.textSecondary,
                    marginTop: Spacing.xs,
                  }}>
                    ID: {customer.id.slice(0, 8)}
                  </div>
                </div>
                <span style={{ color: Colors.primary, fontSize: FontSizes.lg }}>→</span>
              </button>
            ))}
          </div>
        ) : searchQuery && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: Spacing.lg,
            color: Colors.textSecondary,
          }}>
            Nenhum cliente encontrado
          </div>
        ) : null}
      </div>

      {/* Create New Customer */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            width: '100%',
            padding: Spacing.md,
            backgroundColor: Colors.secondary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.md,
            cursor: 'pointer',
          }}
        >
          + Criar Novo Cliente
        </button>
      ) : (
        <div style={{
          padding: Spacing.md,
          backgroundColor: Colors.backgroundSecondary,
          borderRadius: BorderRadius.md,
        }}>
          <h4 style={{
            margin: 0,
            marginBottom: Spacing.sm,
            fontSize: FontSizes.md,
            fontWeight: 600,
          }}>
            Novo Cliente
          </h4>
          <div style={{ display: 'flex', gap: Spacing.sm }}>
            <input
              type="text"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Nome do cliente"
              style={{
                flex: 1,
                padding: Spacing.sm,
                fontSize: FontSizes.md,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                outline: 'none',
              }}
              autoFocus
            />
            <button
              onClick={handleCreateCustomer}
              disabled={creating}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: Colors.success,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.md,
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? 'A criar...' : 'Criar'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewCustomerName('');
              }}
              style={{
                padding: `${Spacing.sm}px ${Spacing.md}px`,
                backgroundColor: Colors.backgroundSecondary,
                color: Colors.text,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.md,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
