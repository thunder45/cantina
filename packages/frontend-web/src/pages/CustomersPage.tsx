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
  PaymentRegistrationModal,
} from '../components/customers';

interface CustomersPageProps {
  apiClient: ApiClient;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ apiClient }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<number>(0);

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

  const handleCreateCustomer = useCallback(async (name: string): Promise<Customer> => {
    const customer = await customerService.createCustomer(name);
    return customer;
  }, []);

  const handleRegisterPayment = useCallback(() => {
    setShowPaymentModal(true);
  }, []);

  const handlePaymentConfirmed = useCallback(async () => {
    setShowPaymentModal(false);
    // Refresh customer data
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
      {/* Header */}
      <div style={{
        padding: Spacing.md,
        backgroundColor: Colors.background,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: FontSizes.lg,
          fontWeight: 600,
          color: Colors.text,
        }}>
          Gestão de Clientes
        </h2>
        <p style={{
          margin: 0,
          marginTop: Spacing.xs,
          fontSize: FontSizes.sm,
          color: Colors.textSecondary,
        }}>
          Pesquise clientes, visualize histórico e registe pagamentos
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: Colors.background,
      }}>
        {selectedCustomer ? (
          <CustomerHistory
            apiClient={apiClient}
            customer={selectedCustomer}
            onRegisterPayment={handleRegisterPayment}
            onBack={handleBack}
          />
        ) : (
          <CustomerSearch
            apiClient={apiClient}
            onSelectCustomer={handleSelectCustomer}
            onCreateCustomer={handleCreateCustomer}
          />
        )}
      </div>

      {/* Payment Registration Modal */}
      {showPaymentModal && selectedCustomer && (
        <PaymentRegistrationModal
          apiClient={apiClient}
          customer={selectedCustomer}
          balance={customerBalance}
          onConfirm={handlePaymentConfirmed}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
