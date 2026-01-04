import React from 'react';
import { Receipt, Colors, Spacing, FontSizes, BorderRadius } from '@cantina-pos/shared';

interface ReceiptViewProps {
  receipt: Receipt;
  onClose: () => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  transfer: 'Transferência',
  credit: 'Anotado (Fiado)',
  balance: 'Saldo',
};

const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const ReceiptView: React.FC<ReceiptViewProps> = ({ receipt, onClose }) => (
  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={onClose}>
    <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.lg, maxWidth: 400, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: 'monospace', fontSize: FontSizes.sm }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottom: `1px dashed ${Colors.border}` }}>
          <div style={{ fontWeight: 700, fontSize: FontSizes.md }}>CANTINA ADVM</div>
          <div style={{ color: Colors.textSecondary }}>{receipt.eventName}</div>
          <div style={{ color: Colors.textSecondary, marginTop: Spacing.xs }}>{formatDate(receipt.createdAt)}</div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: Spacing.md }}>
          {receipt.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: Spacing.xs }}>
              <div style={{ flex: 1 }}>
                <div>{item.description}</div>
                <div style={{ color: Colors.textSecondary, fontSize: FontSizes.xs }}>{item.quantity} × {formatPrice(item.unitPrice)}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{formatPrice(item.total)}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px dashed ${Colors.border}`, marginBottom: Spacing.md }} />

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: FontSizes.md, marginBottom: Spacing.md }}>
          <span>TOTAL</span>
          <span>{formatPrice(receipt.total)}</span>
        </div>

        {/* Payments */}
        <div style={{ marginBottom: Spacing.md, paddingTop: Spacing.sm, borderTop: `1px dashed ${Colors.border}` }}>
          <div style={{ fontWeight: 600, marginBottom: Spacing.xs }}>Pagamento:</div>
          {receipt.payments.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: Colors.textSecondary }}>
              <span>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
              <span>{formatPrice(p.amount)}</span>
            </div>
          ))}
        </div>

        {/* Customer */}
        {receipt.customerName && (
          <div style={{ marginBottom: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.backgroundSecondary, borderRadius: BorderRadius.sm }}>
            <div style={{ fontWeight: 600 }}>Cliente:</div>
            <div>{receipt.customerName}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: Spacing.md, borderTop: `1px dashed ${Colors.border}`, color: Colors.textSecondary, fontSize: FontSizes.xs }}>
          <div>Operador: {receipt.createdBy}</div>
          <div style={{ marginTop: Spacing.sm }}>Obrigado pela preferência!</div>
        </div>
      </div>

      <button onClick={onClose} style={{ width: '100%', marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: Colors.primary, color: Colors.textLight, border: 'none', borderRadius: BorderRadius.md, cursor: 'pointer' }}>
        Fechar
      </button>
    </div>
  </div>
);
