import React, { useState, useEffect, useCallback } from 'react';
import {
  Event,
  EventReport,
  ApiClient,
  ReportApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface EventReportViewProps {
  apiClient: ApiClient;
  event: Event;
  onExportCSV: () => void;
}

export const EventReportView: React.FC<EventReportViewProps> = ({
  apiClient,
  event,
  onExportCSV,
}) => {
  const [report, setReport] = useState<EventReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const reportService = new ReportApiService(apiClient);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getEventReport(event.id, {
        category: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(data);
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id, selectedCategory, startDate, endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const formatPrice = (price: number): string => `€${price.toFixed(2)}`;

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      card: 'Cartão',
      transfer: 'Transferência',
      credit: 'Anotado',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
        color: Colors.textSecondary,
      }}>
        A carregar relatório...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: Spacing.lg,
        textAlign: 'center',
        color: Colors.danger,
      }}>
        {error}
        <button
          onClick={loadReport}
          style={{
            display: 'block',
            margin: `${Spacing.md}px auto 0`,
            padding: `${Spacing.sm}px ${Spacing.md}px`,
            backgroundColor: Colors.primary,
            color: Colors.textLight,
            border: 'none',
            borderRadius: BorderRadius.md,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={{ padding: Spacing.md }}>
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        flexWrap: 'wrap',
      }}>
        {/* Category Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: Spacing.xs,
            fontSize: FontSizes.xs,
            color: Colors.textSecondary,
          }}>
            Categoria
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: Spacing.sm,
              fontSize: FontSizes.sm,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
              minWidth: 150,
            }}
          >
            <option value="">Todas</option>
            {event.categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: Spacing.xs,
            fontSize: FontSizes.xs,
            color: Colors.textSecondary,
          }}>
            Data Início
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: Spacing.sm,
              fontSize: FontSizes.sm,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            marginBottom: Spacing.xs,
            fontSize: FontSizes.xs,
            color: Colors.textSecondary,
          }}>
            Data Fim
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: Spacing.sm,
              fontSize: FontSizes.sm,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
            }}
          />
        </div>

        {/* Export Button */}
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            onClick={onExportCSV}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: Colors.secondary,
              color: Colors.textLight,
              border: 'none',
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.sm,
              cursor: 'pointer',
            }}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
      }}>
        <SummaryCard
          title="Total Vendas"
          value={formatPrice(report.totalSales)}
          color={Colors.primary}
        />
        <SummaryCard
          title="Total Pago"
          value={formatPrice(report.totalPaid)}
          color={Colors.success}
        />
        <SummaryCard
          title="Anotado"
          value={formatPrice(report.totalPending)}
          color={Colors.warning}
        />
        <SummaryCard
          title="Estornado"
          value={formatPrice(report.totalRefunded)}
          color={Colors.danger}
        />
      </div>

      {/* Items Sold */}
      <div style={{
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        border: `1px solid ${Colors.border}`,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: Spacing.md,
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: Colors.backgroundSecondary,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: FontSizes.md,
            fontWeight: 600,
            color: Colors.text,
          }}>
            Itens Vendidos
          </h3>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {report.itemsSold.length === 0 ? (
            <div style={{
              padding: Spacing.lg,
              textAlign: 'center',
              color: Colors.textSecondary,
            }}>
              Nenhum item vendido
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: Colors.backgroundSecondary }}>
                  <th style={tableHeaderStyle}>Item</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Qtd</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.itemsSold.map((item, index) => (
                  <tr key={index} style={{ borderBottom: `1px solid ${Colors.border}` }}>
                    <td style={tableCellStyle}>{item.description}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 500 }}>
                      {formatPrice(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Breakdown */}
      <div style={{
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        border: `1px solid ${Colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: Spacing.md,
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: Colors.backgroundSecondary,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: FontSizes.md,
            fontWeight: 600,
            color: Colors.text,
          }}>
            Formas de Pagamento
          </h3>
        </div>
        <div style={{ padding: Spacing.md }}>
          {report.paymentBreakdown.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: Colors.textSecondary,
            }}>
              Nenhum pagamento registado
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {report.paymentBreakdown.map((payment, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: Spacing.sm,
                    backgroundColor: Colors.backgroundSecondary,
                    borderRadius: BorderRadius.md,
                  }}
                >
                  <span style={{ fontSize: FontSizes.sm, color: Colors.text }}>
                    {getPaymentMethodLabel(payment.method)}
                  </span>
                  <span style={{ fontSize: FontSizes.md, fontWeight: 600, color: Colors.primary }}>
                    {formatPrice(payment.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Detail */}
      <div style={{
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        border: `1px solid ${Colors.border}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: Spacing.md,
          borderBottom: `1px solid ${Colors.border}`,
          backgroundColor: Colors.backgroundSecondary,
        }}>
          <h3 style={{ margin: 0, fontSize: FontSizes.md, fontWeight: 600, color: Colors.text }}>
            Vendas Detalhadas ({report.sales?.length || 0})
          </h3>
        </div>
        <div style={{ padding: Spacing.md, maxHeight: 400, overflow: 'auto' }}>
          {!report.sales || report.sales.length === 0 ? (
            <div style={{ textAlign: 'center', color: Colors.textSecondary }}>
              Nenhuma venda registada
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.sm }}>
              {report.sales.map((sale) => (
                <div
                  key={sale.id}
                  style={{
                    padding: Spacing.sm,
                    backgroundColor: sale.refunded ? '#fff5f5' : Colors.backgroundSecondary,
                    borderRadius: BorderRadius.md,
                    border: sale.refunded ? `1px solid ${Colors.danger}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: FontSizes.xs, color: Colors.textSecondary }}>
                      {new Date(sale.createdAt).toLocaleString('pt-PT')}
                      {sale.customerName && ` • ${sale.customerName}`}
                    </span>
                    <span style={{ 
                      fontSize: FontSizes.sm, 
                      fontWeight: 600, 
                      color: sale.refunded ? Colors.danger : Colors.success,
                      textDecoration: sale.refunded ? 'line-through' : 'none',
                    }}>
                      {formatPrice(sale.total)}
                    </span>
                  </div>
                  <div style={{ fontSize: FontSizes.xs, color: Colors.text }}>
                    {sale.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}
                  </div>
                  <div style={{ fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 }}>
                    {sale.payments.map(p => `${getPaymentMethodLabel(p.method)}: ${formatPrice(p.amount)}`).join(' + ')}
                    {sale.refunded && <span style={{ color: Colors.danger, marginLeft: 8 }}>ESTORNADO</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{
  title: string;
  value: string;
  color: string;
}> = ({ title, value, color }) => (
  <div style={{
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    border: `1px solid ${Colors.border}`,
    borderLeft: `4px solid ${color}`,
  }}>
    <div style={{
      fontSize: FontSizes.sm,
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    }}>
      {title}
    </div>
    <div style={{
      fontSize: FontSizes.xl,
      fontWeight: 700,
      color: color,
    }}>
      {value}
    </div>
  </div>
);

const tableHeaderStyle: React.CSSProperties = {
  padding: Spacing.sm,
  textAlign: 'left',
  fontSize: FontSizes.xs,
  fontWeight: 600,
  color: Colors.textSecondary,
  textTransform: 'uppercase',
};

const tableCellStyle: React.CSSProperties = {
  padding: Spacing.sm,
  fontSize: FontSizes.sm,
  color: Colors.text,
};
