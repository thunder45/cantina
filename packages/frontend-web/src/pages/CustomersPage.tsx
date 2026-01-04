import React, { useState, useCallback } from 'react';
import {
  Customer,
  ApiClient,
  CustomerApiService,
  Colors,
  Spacing,
  FontSizes,
} from '@cantina-pos/shared';
import {
  CustomerSearch,
  CustomerHistory,
  TransactionModal,
} from '../components/customers';

interface CustomersPageProps {
  apiClient: ApiClient;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ apiClient }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const customerService = new CustomerApiService(apiClient);

  const handleSelectCustomer = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const balance = await customerService.getCustomerBalance(customer.id);
      setCustomerBalance(balance);
    } catch (err) {
      console.error('Failed to get customer balance:', err);
      setCustomerBalance(0);
    }
  }, []);

  const handleCreateCustomer = useCallback(async (name: string, initialBalance?: number): Promise<Customer> => {
    return customerService.createCustomer(name, undefined, initialBalance);
  }, []);

  const handleTransactionConfirmed = useCallback(async () => {
    setModalType(null);
    setRefreshKey(k => k + 1);
    if (selectedCustomer) {
      try {
        const balance = await customerService.getCustomerBalance(selectedCustomer.id);
        setCustomerBalance(balance);
      } catch (err) {
        console.error('Failed to refresh balance:', err);
      }
    }
  }, [selectedCustomer]);

  const handleBack = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerBalance(0);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 52px)',
      backgroundColor: Colors.backgroundSecondary,
    }}>
      <div style={{
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <h2 style={{ margin: 0, fontSize: FontSizes.lg, fontWeight: 600, color: Colors.text }}>
          Gestão de Clientes
        </h2>
        <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.sm, color: Colors.textSecondary }}>
          Pesquise clientes, visualize histórico e faça depósitos
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: Colors.background }}>
        {selectedCustomer ? (
          <CustomerHistory
            key={refreshKey}
            apiClient={apiClient}
            customer={selectedCustomer}
            onDeposit={() => setModalType('deposit')}
            onWithdraw={() => setModalType('withdraw')}
            onBack={handleBack}
            onCustomerUpdated={setSelectedCustomer}
          />
        ) : (
          <CustomerSearch
            apiClient={apiClient}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomer={handleCreateCustomer}
          />
        )}
      </div>

      {modalType && selectedCustomer && (
        <TransactionModal
          apiClient={apiClient}
          customer={selectedCustomer}
          type={modalType}
          maxAmount={modalType === 'withdraw' ? customerBalance : undefined}
          onConfirm={handleTransactionConfirmed}
          onCancel={() => setModalType(null)}
        />
      )}
    </div>
  );
};
