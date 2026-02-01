import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Customer,
  CustomerWithBalance,
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
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [modalType, setModalType] = useState<'deposit' | 'withdraw' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const customerService = new CustomerApiService(apiClient);

  const handleSelectCustomer = useCallback(async (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
    setCustomerBalance(customer.balance ?? 0);
  }, []);

  const handleCreateCustomer = useCallback(async (name: string, initialBalance?: number): Promise<Customer> => {
    return customerService.createCustomer(name, initialBalance);
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
          {t('customers.management')}
        </h2>
        <p style={{ margin: 0, marginTop: Spacing.xs, fontSize: FontSizes.sm, color: Colors.textSecondary }}>
          {t('customers.managementDescription')}
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
