import React, { useState, useEffect, useCallback } from 'react';
import {
  GlobalReport,
  EventCategory,
  CustomerWithBalance,
  ApiClient,
  ReportApiService,
  EventCategoryApiService,
  CustomerApiService,
  SalesApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
  PaymentMethod,
  Receipt,
} from '@cantina-pos/shared';
import { ReceiptView } from '../common/ReceiptView';

interface GlobalReportViewProps {
  apiClient: ApiClient;
  eventId?: string; // If provided, filter to single event
  onExportCSV?: () => void;
}

export const GlobalReportView: React.FC<GlobalReportViewProps> = ({
  apiClient,
  eventId,
  onExportCSV,
}) => {
  const [report, setReport] = useState<GlobalReport | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Collapse states
  const [categoryCollapsed, setCategoryCollapsed] = useState(false);
  const [paymentCollapsed, setPaymentCollapsed] = useState(false);
  const [salesCollapsed, setSalesCollapsed] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');

  const reportService = new ReportApiService(apiClient);
  const categoryService = new EventCategoryApiService(apiClient);
  const customerService = new CustomerApiService(apiClient);
  const salesService = new SalesApiService(apiClient);

  const loadFilters = useCallback(async () => {
    try {
      const [cats, custs] = await Promise.all([
        categoryService.getCategories(),
        customerService.getAllCustomers(),
      ]);
      setCategories(cats);
      setCustomers(custs);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getGlobalReport({
        eventId: eventId || undefined,
        categoryId: categoryFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        paymentMethod: paymentMethodFilter as PaymentMethod || undefined,
        customerId: customerFilter || undefined,
      });
      setReport(data);
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, categoryFilter, startDate, endDate, paymentMethodFilter, customerFilter]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleViewReceipt = async (saleId: string) => {
    try {
      const receipt = await salesService.getReceipt(saleId);
      setSelectedReceipt(receipt);
    } catch (err) {
      console.error('Failed to load receipt:', err);
    }
  };

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      card: 'Cartão',
      transfer: 'Transferência',
      balance: 'Fiado Pago',
      credit: 'Fiado',
    };
    return labels[method] || method;
  };

  if (loading && !report) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: Colors.textSecondary }}>
        A carregar relatório...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: Spacing.lg, textAlign: 'center', color: Colors.danger }}>
        {error}
        <button onClick={loadReport} style={{ display: 'block', margin: `${Spacing.md}px auto 0`, padding: `${Spacing.sm}px ${Spacing.md}px`, backgroundColor: Colors.primary, color: Colors.textLight, border: 'none', borderRadius: BorderRadius.md, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!report) return null;

  const showAllFilters = !eventId; // Hide category/date filters when viewing single event

  return (
    <div style={{ padding: Spacing.md }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {showAllFilters && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>Categoria</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: Spacing.sm, fontSize: FontSizes.sm, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, minWidth: 120 }}>
                <option value="">Todas</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>Data Início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: Spacing.sm, fontSize: FontSizes.sm, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>Data Fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: Spacing.sm, fontSize: FontSizes.sm, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md }} />
            </div>
          </>
        )}
        <div>
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>Pagamento</label>
          <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} style={{ padding: Spacing.sm, fontSize: FontSizes.sm, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, minWidth: 120 }}>
            <option value="">Todos</option>
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
            <option value="transfer">Transferência</option>
            <option value="credit">Fiado</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: Spacing.xs, fontSize: FontSizes.xs, color: Colors.textSecondary }}>Cliente</label>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ padding: Spacing.sm, fontSize: FontSizes.sm, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, minWidth: 120 }}>
            <option value="">Todos</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {(categoryFilter || startDate || endDate || paymentMethodFilter || customerFilter) && (
          <button onClick={() => { setCategoryFilter(''); setStartDate(''); setEndDate(''); setPaymentMethodFilter(''); setCustomerFilter(''); }} style={{ padding: Spacing.sm, backgroundColor: Colors.backgroundSecondary, border: `1px solid ${Colors.border}`, borderRadius: BorderRadius.md, fontSize: FontSizes.sm, cursor: 'pointer' }}>
            Limpar
          </button>
        )}
        {onExportCSV && (
          <button onClick={onExportCSV} style={{ marginLeft: 'auto', padding: `${Spacing.sm}px ${Spacing.md}px`, backgroundColor: Colors.secondary, color: Colors.textLight, border: 'none', borderRadius: BorderRadius.md, fontSize: FontSizes.sm, cursor: 'pointer' }}>
            📥 Exportar CSV
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: Spacing.md, marginBottom: Spacing.lg }}>
        <SummaryCard title="Total Vendas" value={formatPrice(report.totalSales)} color={Colors.primary} />
        <SummaryCard title="Total Pago" value={formatPrice(report.totalPaid)} color={Colors.success} />
        <SummaryCard title="Fiado" value={formatPrice(report.totalPending)} color={Colors.warning} />
        <SummaryCard title="Estornado" value={formatPrice(report.totalRefunded)} color={Colors.danger} />
      </div>

      {/* Category Breakdown */}
      {report.categoryBreakdown.length > 0 && (
        <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, border: `1px solid ${Colors.border}`, marginBottom: Spacing.lg, overflow: 'hidden' }}>
          <div style={{ padding: Spacing.md, borderBottom: `1px solid ${Colors.border}`, backgroundColor: Colors.backgroundSecondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: FontSizes.md, fontWeight: 600, color: Colors.text }}>Por Categoria</h3>
            <button onClick={() => setCategoryCollapsed(!categoryCollapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FontSizes.md, color: Colors.textSecondary }}>{categoryCollapsed ? '▼' : '▲'}</button>
          </div>
          {!categoryCollapsed && (
          <div style={{ padding: Spacing.md }}>
            {report.categoryBreakdown.map((cat) => (
              <div key={cat.categoryId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.backgroundSecondary, borderRadius: BorderRadius.md, marginBottom: Spacing.xs }}>
                <span style={{ fontSize: FontSizes.sm, fontWeight: 500 }}>{cat.categoryName}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: FontSizes.md, fontWeight: 600, color: Colors.primary }}>{formatPrice(cat.total)}</span>
                  {cat.pending > 0 && <span style={{ fontSize: FontSizes.xs, color: Colors.warning, marginLeft: Spacing.sm }}>(Fiado: {formatPrice(cat.pending)})</span>}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Payment Breakdown */}
      <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, border: `1px solid ${Colors.border}`, marginBottom: Spacing.lg, overflow: 'hidden' }}>
        <div style={{ padding: Spacing.md, borderBottom: `1px solid ${Colors.border}`, backgroundColor: Colors.backgroundSecondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: FontSizes.md, fontWeight: 600, color: Colors.text }}>Formas de Pagamento</h3>
          <button onClick={() => setPaymentCollapsed(!paymentCollapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FontSizes.md, color: Colors.textSecondary }}>{paymentCollapsed ? '▼' : '▲'}</button>
        </div>
        {!paymentCollapsed && (
        <div style={{ padding: Spacing.md }}>
          {report.paymentBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', color: Colors.textSecondary }}>Nenhum pagamento</div>
          ) : (
            report.paymentBreakdown.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm, backgroundColor: Colors.backgroundSecondary, borderRadius: BorderRadius.md, marginBottom: Spacing.xs }}>
                <span style={{ fontSize: FontSizes.sm }}>{getPaymentMethodLabel(p.method)}</span>
                <span style={{ fontSize: FontSizes.md, fontWeight: 600, color: Colors.primary }}>{formatPrice(p.total)}</span>
              </div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Sales Detail */}
      <div style={{ backgroundColor: Colors.background, borderRadius: BorderRadius.lg, border: `1px solid ${Colors.border}`, overflow: 'hidden' }}>
        <div style={{ padding: Spacing.md, borderBottom: `1px solid ${Colors.border}`, backgroundColor: Colors.backgroundSecondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: FontSizes.md, fontWeight: 600, color: Colors.text }}>Vendas ({report.sales.length})</h3>
          <button onClick={() => setSalesCollapsed(!salesCollapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: FontSizes.md, color: Colors.textSecondary }}>{salesCollapsed ? '▼' : '▲'}</button>
        </div>
        {!salesCollapsed && (
        <div style={{ padding: Spacing.md, maxHeight: 400, overflow: 'auto' }}>
          {report.sales.length === 0 ? (
            <div style={{ textAlign: 'center', color: Colors.textSecondary }}>Nenhuma venda</div>
          ) : (
            report.sales.map((sale) => {
              const creditAmount = sale.payments.find(p => p.method === 'credit')?.amount || 0;
              const balanceAmount = sale.payments.find(p => p.method === 'balance')?.amount || 0;
              const hadCredit = creditAmount > 0 || balanceAmount > 0;
              const paymentStr = sale.payments.map(p => `${getPaymentMethodLabel(p.method)}: ${formatPrice(p.amount)}`).join(' + ');
              return (
              <div key={sale.id} onClick={() => handleViewReceipt(sale.id)} style={{ padding: Spacing.sm, backgroundColor: sale.refunded ? '#fff5f5' : Colors.backgroundSecondary, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, cursor: 'pointer', border: sale.refunded ? `1px solid ${Colors.danger}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                    {new Date(sale.createdAt).toLocaleString('pt-PT')} <span style={{ backgroundColor: Colors.primary, color: Colors.textLight, padding: '1px 4px', borderRadius: 3 }}>{sale.categoryName}</span> {sale.eventName}
                  </div>
                  <span style={{ fontSize: FontSizes.sm, fontWeight: 600, color: sale.refunded ? Colors.danger : creditAmount > 0 ? Colors.warning : Colors.success, textDecoration: sale.refunded ? 'line-through' : 'none' }}>
                    {formatPrice(sale.total)}
                  </span>
                </div>
                <div style={{ fontSize: FontSizes.xs, color: Colors.text, marginTop: 2 }}>{sale.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}</div>
                <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 }}>{paymentStr}</div>
                {hadCredit && sale.customerName && <div style={{ fontSize: FontSizes.xs, color: Colors.text, marginTop: 2 }}>• {sale.customerName}</div>}
                {sale.refunded && <span style={{ fontSize: FontSizes.xs, color: Colors.danger }}>ESTORNADO</span>}
              </div>
            );})
          )}
        </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && <ReceiptView receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => (
  <div style={{ padding: Spacing.lg, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, border: `1px solid ${Colors.border}`, borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.xs }}>{title}</div>
    <div style={{ fontSize: FontSizes.xl, fontWeight: 700, color }}>{value}</div>
  </div>
);
