import React, { useState, useEffect, useCallback } from 'react';
import {
  EventCategory,
  CategoryReport,
  ApiClient,
  ReportApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface CategoryReportViewProps {
  apiClient: ApiClient;
  category: EventCategory;
  onExportCSV: () => void;
}

export const CategoryReportView: React.FC<CategoryReportViewProps> = ({
  apiClient,
  category,
  onExportCSV,
}) => {
  const [report, setReport] = useState<CategoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportService = new ReportApiService(apiClient);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getCategoryReport(category.id);
      setReport(data);
    } catch (err) {
      setError('Erro ao carregar relatório da categoria');
      console.error('Failed to load category report:', err);
    } finally {
      setLoading(false);
    }
  }, [category.id]);

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
        A carregar relatório da categoria...
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
      {/* Header with Export */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: FontSizes.lg,
            fontWeight: 600,
            color: Colors.text,
          }}>
            {report.categoryName}
          </h3>
          <p style={{
            margin: 0,
            marginTop: Spacing.xs,
            fontSize: FontSizes.sm,
            color: Colors.textSecondary,
          }}>
            {report.eventCount} {report.eventCount === 1 ? 'evento' : 'eventos'}
          </p>
        </div>
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
          title="Pendente"
          value={formatPrice(report.totalPending)}
          color={Colors.warning}
        />
        <SummaryCard
          title="Estornado"
          value={formatPrice(report.totalRefunded)}
          color={Colors.danger}
        />
      </div>

      {/* Event Breakdown */}
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
            Vendas por Evento
          </h3>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {report.eventBreakdown.length === 0 ? (
            <div style={{
              padding: Spacing.lg,
              textAlign: 'center',
              color: Colors.textSecondary,
            }}>
              Nenhum evento com vendas
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: Colors.backgroundSecondary }}>
                  <th style={tableHeaderStyle}>Evento</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {report.eventBreakdown.map((event, index) => (
                  <tr key={event.eventId || index} style={{ borderBottom: `1px solid ${Colors.border}` }}>
                    <td style={tableCellStyle}>{event.eventName}</td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 500 }}>
                      {formatPrice(event.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: Colors.backgroundSecondary }}>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>Total</td>
                  <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, color: Colors.primary }}>
                    {formatPrice(report.totalSales)}
                  </td>
                </tr>
              </tfoot>
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
