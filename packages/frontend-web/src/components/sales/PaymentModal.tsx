import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Order,
  Customer,
  PaymentMethod,
  PaymentPart,
  ApiClient,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  getModalStyles,
  TouchTargets,
} from '@cantina-pos/shared';
import { CustomerSelectModal } from './CustomerSelectModal';
import { usePlatform, useKeyboardShortcuts, KeyboardShortcut } from '../../hooks';
import { getResponsiveModalStyles, getTouchButtonStyles, getResponsiveFontSize } from '../../styles';

interface PaymentModalProps {
  apiClient: ApiClient;
  order: Order;
  onConfirm: (payments: PaymentPart[], customerId?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; shortcut: string }[] = [
  { value: 'cash', label: 'Dinheiro', shortcut: '1' },
  { value: 'card', label: 'Cartão', shortcut: '2' },
  { value: 'transfer', label: 'Transferência', shortcut: '3' },
  { value: 'credit', label: 'Anotar (Fiado)', shortcut: '4' },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  apiClient,
  order,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [payments, setPayments] = useState<PaymentPart[]>([]);
  const [currentAmount, setCurrentAmount] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const { platform, orientation, isTouch } = usePlatform();
  const styleOptions = { platform, orientation, isTouch };
  const touchTarget = TouchTargets[platform];

  const modalStyles = getModalStyles();
  const responsiveModalStyles = getResponsiveModalStyles(styleOptions);

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  // Calculate remaining amount for mixed payments
  const paidAmount = useMemo(() => 
    payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const remainingAmount = useMemo(() => 
    Math.max(0, order.total - paidAmount),
    [order.total, paidAmount]
  );

  // Handle single payment method selection
  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);

    if (method === 'credit') {
      setShowCustomerSelect(true);
    }

    // Focus amount input for mixed payments
    if (isMixedPayment && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isMixedPayment]);

  // Handle customer selection for credit sales
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
  }, []);

  // Add payment part for mixed payments
  const handleAddPayment = useCallback(() => {
    if (!selectedMethod) {
      setError('Selecione um método de pagamento');
      return;
    }

    const amount = parseFloat(currentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Valor inválido');
      return;
    }

    if (amount > remainingAmount + 0.01) { // Small tolerance for floating point
      setError('Valor excede o restante');
      return;
    }

    // For credit in mixed payment, require customer
    if (selectedMethod === 'credit' && !selectedCustomer) {
      setShowCustomerSelect(true);
      return;
    }

    setPayments([...payments, { method: selectedMethod, amount }]);
    setCurrentAmount('');
    setSelectedMethod(null);
    setError(null);
  }, [selectedMethod, currentAmount, remainingAmount, selectedCustomer, payments]);

  // Remove payment part
  const handleRemovePayment = useCallback((index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  }, [payments]);

  // Confirm payment
  const handleConfirm = useCallback(() => {
    setError(null);

    if (isMixedPayment) {
      // Validate mixed payment total
      if (Math.abs(paidAmount - order.total) > 0.01) {
        setError('O total dos pagamentos deve ser igual ao valor do pedido');
        return;
      }

      // Check if any payment is credit
      const hasCredit = payments.some(p => p.method === 'credit');
      if (hasCredit && !selectedCustomer) {
        setError('Selecione um cliente para pagamento a crédito');
        return;
      }

      onConfirm(payments, hasCredit ? selectedCustomer?.id : undefined);
    } else {
      // Single payment
      if (!selectedMethod) {
        setError('Selecione um método de pagamento');
        return;
      }

      if (selectedMethod === 'credit' && !selectedCustomer) {
        setError('Selecione um cliente para pagamento a crédito');
        return;
      }

      const singlePayment: PaymentPart[] = [{ method: selectedMethod, amount: order.total }];
      onConfirm(singlePayment, selectedMethod === 'credit' ? selectedCustomer?.id : undefined);
    }
  }, [isMixedPayment, paidAmount, order.total, payments, selectedMethod, selectedCustomer, onConfirm]);

  // Check if can confirm
  const canConfirm = useMemo(() => {
    if (loading) return false;

    if (isMixedPayment) {
      return Math.abs(paidAmount - order.total) < 0.01;
    } else {
      if (!selectedMethod) return false;
      if (selectedMethod === 'credit' && !selectedCustomer) return false;
      return true;
    }
  }, [loading, isMixedPayment, paidAmount, order.total, selectedMethod, selectedCustomer]);

  // Keyboard shortcuts for desktop
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    { key: 'Escape', description: 'Cancel', action: onCancel },
    { key: 'Enter', description: 'Confirm', action: () => canConfirm && handleConfirm() },
    { key: '1', description: 'Cash', action: () => handleMethodSelect('cash') },
    { key: '2', description: 'Card', action: () => handleMethodSelect('card') },
    { key: '3', description: 'Transfer', action: () => handleMethodSelect('transfer') },
    { key: '4', description: 'Credit', action: () => handleMethodSelect('credit') },
  ], [onCancel, canConfirm, handleConfirm, handleMethodSelect]);

  useKeyboardShortcuts(shortcuts, platform === 'desktop' && !showCustomerSelect);

  // Auto-focus first payment method on desktop
  useEffect(() => {
    if (platform === 'desktop' && !selectedMethod) {
      // Focus is handled by keyboard shortcuts
    }
  }, [platform, selectedMethod]);

  // Button styles
  const getPaymentButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    ...getTouchButtonStyles(styleOptions),
    padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
    backgroundColor: isSelected ? Colors.primary : Colors.background,
    color: isSelected ? Colors.textLight : Colors.text,
    border: `2px solid ${isSelected ? Colors.primary : Colors.border}`,
    borderRadius: BorderRadius.md,
    cursor: isTouch ? 'default' : 'pointer',
    fontSize: getResponsiveFontSize(styleOptions, 'md'),
    fontWeight: 500,
    minHeight: touchTarget.recommended,
  });

  return (
    <>
      <div style={modalStyles.overlay} onClick={onCancel}>
        <div
          style={{ 
            ...modalStyles.container, 
            ...responsiveModalStyles,
            maxWidth: platform === 'mobile' ? '100%' : 500,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={modalStyles.header}>
            <h3 style={{ ...modalStyles.title, fontSize: getResponsiveFontSize(styleOptions, 'lg') }}>
              Pagamento
            </h3>
            <button 
              onClick={onCancel} 
              style={{
                ...modalStyles.closeButton,
                minWidth: touchTarget.minSize,
                minHeight: touchTarget.minSize,
              }} 
              disabled={loading}
            >
              ×
            </button>
          </div>

          <div style={{ ...modalStyles.content, padding: platform === 'tablet' ? Spacing.lg : Spacing.md }}>
            {error && (
              <div style={{
                padding: Spacing.sm,
                backgroundColor: Colors.danger,
                color: Colors.textLight,
                borderRadius: BorderRadius.sm,
                marginBottom: Spacing.md,
                fontSize: getResponsiveFontSize(styleOptions, 'sm'),
              }}>
                {error}
              </div>
            )}

            {/* Order Total */}
            <div style={{
              padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
              backgroundColor: Colors.backgroundSecondary,
              borderRadius: BorderRadius.md,
              marginBottom: Spacing.lg,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: getResponsiveFontSize(styleOptions, 'sm'), color: Colors.textSecondary }}>
                Total a pagar
              </div>
              <div style={{
                fontSize: getResponsiveFontSize(styleOptions, 'xl'),
                fontWeight: 700,
                color: Colors.primary,
              }}>
                {formatPrice(order.total)}
              </div>
            </div>

            {/* Payment Type Toggle */}
            <div style={{
              display: 'flex',
              gap: Spacing.sm,
              marginBottom: Spacing.lg,
            }}>
              <button
                onClick={() => {
                  setIsMixedPayment(false);
                  setPayments([]);
                }}
                style={{
                  ...getTouchButtonStyles(styleOptions),
                  flex: 1,
                  padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                  backgroundColor: !isMixedPayment ? Colors.primary : Colors.background,
                  color: !isMixedPayment ? Colors.textLight : Colors.text,
                  border: `1px solid ${!isMixedPayment ? Colors.primary : Colors.border}`,
                  borderRadius: BorderRadius.md,
                  fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  fontWeight: 500,
                }}
              >
                Pagamento Único
              </button>
              <button
                onClick={() => {
                  setIsMixedPayment(true);
                  setSelectedMethod(null);
                }}
                style={{
                  ...getTouchButtonStyles(styleOptions),
                  flex: 1,
                  padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                  backgroundColor: isMixedPayment ? Colors.primary : Colors.background,
                  color: isMixedPayment ? Colors.textLight : Colors.text,
                  border: `1px solid ${isMixedPayment ? Colors.primary : Colors.border}`,
                  borderRadius: BorderRadius.md,
                  fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  fontWeight: 500,
                }}
              >
                Pagamento Misto
              </button>
            </div>

            {/* Payment Methods */}
            <div style={{ marginBottom: Spacing.lg }}>
              <label style={{
                display: 'block',
                marginBottom: Spacing.xs,
                fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                fontWeight: 500,
                color: Colors.text,
              }}>
                Método de pagamento
                {platform === 'desktop' && (
                  <span style={{ color: Colors.textSecondary, fontWeight: 400 }}> (1-4)</span>
                )}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: platform === 'tablet' ? Spacing.md : Spacing.sm,
              }}>
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.value}
                    onClick={() => handleMethodSelect(method.value)}
                    style={getPaymentButtonStyle(selectedMethod === method.value)}
                    title={platform === 'desktop' ? `Press ${method.shortcut}` : undefined}
                  >
                    {method.label}
                    {platform === 'desktop' && (
                      <span style={{ 
                        marginLeft: Spacing.xs, 
                        opacity: 0.6,
                        fontSize: FontSizes.xs,
                      }}>
                        [{method.shortcut}]
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Customer (for credit) */}
            {selectedCustomer && (
              <div style={{
                padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                backgroundColor: Colors.backgroundSecondary,
                borderRadius: BorderRadius.md,
                marginBottom: Spacing.md,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: getResponsiveFontSize(styleOptions, 'sm'), color: Colors.text }}>
                  Cliente: <strong>{selectedCustomer.name}</strong>
                </span>
                <button
                  onClick={() => setShowCustomerSelect(true)}
                  style={{
                    ...getTouchButtonStyles(styleOptions, 'icon'),
                    background: 'none',
                    border: 'none',
                    color: Colors.primary,
                    textDecoration: 'underline',
                    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  }}
                >
                  Alterar
                </button>
              </div>
            )}

            {/* Mixed Payment - Amount Input */}
            {isMixedPayment && selectedMethod && (
              <div style={{ marginBottom: Spacing.md }}>
                <label style={{
                  display: 'block',
                  marginBottom: Spacing.xs,
                  fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  fontWeight: 500,
                  color: Colors.text,
                }}>
                  Valor ({PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label})
                </label>
                <div style={{ display: 'flex', gap: Spacing.sm }}>
                  <input
                    ref={amountInputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    max={remainingAmount}
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPayment();
                      }
                    }}
                    placeholder={`Máx: ${formatPrice(remainingAmount)}`}
                    style={{
                      flex: 1,
                      padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                      border: `1px solid ${Colors.border}`,
                      borderRadius: BorderRadius.md,
                      fontSize: getResponsiveFontSize(styleOptions, 'md'),
                      minHeight: touchTarget.minSize,
                    }}
                  />
                  <button
                    onClick={handleAddPayment}
                    style={{
                      ...getTouchButtonStyles(styleOptions),
                      padding: `${Spacing.sm}px ${Spacing.md}px`,
                      backgroundColor: Colors.success,
                      color: Colors.textLight,
                      border: 'none',
                      borderRadius: BorderRadius.md,
                      fontSize: getResponsiveFontSize(styleOptions, 'md'),
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Mixed Payment - Added Payments */}
            {isMixedPayment && payments.length > 0 && (
              <div style={{ marginBottom: Spacing.md }}>
                <label style={{
                  display: 'block',
                  marginBottom: Spacing.xs,
                  fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                  fontWeight: 500,
                  color: Colors.text,
                }}>
                  Pagamentos adicionados
                </label>
                <div style={{
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.md,
                  overflow: 'hidden',
                }}>
                  {payments.map((payment, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: platform === 'tablet' ? Spacing.md : Spacing.sm,
                        backgroundColor: Colors.background,
                        borderBottom: index < payments.length - 1 ? `1px solid ${Colors.border}` : 'none',
                        minHeight: touchTarget.minSize,
                      }}
                    >
                      <span style={{ fontSize: getResponsiveFontSize(styleOptions, 'sm') }}>
                        {PAYMENT_METHODS.find(m => m.value === payment.method)?.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: Spacing.sm }}>
                        <span style={{ fontWeight: 600 }}>{formatPrice(payment.amount)}</span>
                        <button
                          onClick={() => handleRemovePayment(index)}
                          style={{
                            ...getTouchButtonStyles(styleOptions, 'icon'),
                            background: 'none',
                            border: 'none',
                            color: Colors.danger,
                            fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {remainingAmount > 0.01 && (
                  <div style={{
                    marginTop: Spacing.xs,
                    fontSize: getResponsiveFontSize(styleOptions, 'sm'),
                    color: Colors.warning,
                  }}>
                    Restante: {formatPrice(remainingAmount)}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                ...getTouchButtonStyles(styleOptions),
                width: '100%',
                padding: platform === 'tablet' ? Spacing.lg : Spacing.md,
                backgroundColor: canConfirm ? Colors.success : Colors.secondary,
                color: Colors.textLight,
                border: 'none',
                borderRadius: BorderRadius.md,
                fontSize: getResponsiveFontSize(styleOptions, 'lg'),
                fontWeight: 600,
                cursor: canConfirm ? (isTouch ? 'default' : 'pointer') : 'not-allowed',
                opacity: canConfirm ? 1 : 0.6,
                minHeight: platform === 'tablet' ? 56 : touchTarget.recommended,
              }}
            >
              {loading ? 'A processar...' : 'Confirmar Venda'}
              {platform === 'desktop' && canConfirm && (
                <span style={{ marginLeft: Spacing.sm, opacity: 0.7, fontSize: FontSizes.sm }}>
                  [Enter]
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Customer Select Modal */}
      {showCustomerSelect && (
        <CustomerSelectModal
          apiClient={apiClient}
          onSelect={handleCustomerSelect}
          onCancel={() => {
            setShowCustomerSelect(false);
            if (!selectedCustomer) {
              setSelectedMethod(null);
            }
          }}
        />
      )}
    </>
  );
};
