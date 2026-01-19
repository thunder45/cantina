import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Event,
  StockReport,
  ApiClient,
  ReportApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';

interface StockReportViewProps {
  apiClient: ApiClient;
  event: Event;
}

export const StockReportView: React.FC<StockReportViewProps> = ({
  apiClient,
  event,
}) => {
  const { t } = useTranslation();
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportService = new ReportApiService(apiClient);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportService.getStockReport(event.id);
      setReport(data);
    } catch (err) {
      setError(t('reports.loadingStockReport'));
      console.error('Failed to load stock report:', err);
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
        color: Colors.textSecondary,
      }}>
        {t('reports.loadingStockReport')}
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

  // Calculate totals
  const totalInitial = report.items.reduce((sum, item) => 
    item.isInfinite ? sum : sum + item.initialStock, 0);
  const totalSold = report.items.reduce((sum, item) => sum + item.sold, 0);
  const totalAvailable = report.items.reduce((sum, item) => 
    item.isInfinite ? sum : sum + item.available, 0);

  return (
    <div style={{ padding: Spacing.md }}>
      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
      }}>
        <SummaryCard
          title={t('reports.initialStock')}
          value={totalInitial.toString()}
          subtitle={t('reports.units')}
          color={Colors.secondary}
        />
        <SummaryCard
          title={t('reports.soldItems')}
          value={totalSold.toString()}
          subtitle={t('reports.units')}
          color={Colors.success}
        />
        <SummaryCard
          title={t('reports.availableStock')}
          value={totalAvailable.toString()}
          subtitle={t('reports.units')}
          color={Colors.primary}
        />
      </div>

      {/* Stock Table */}
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
            {t('reports.detailsByItem')}
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {report.items.length === 0 ? (
            <div style={{
              padding: Spacing.lg,
              textAlign: 'center',
              color: Colors.textSecondary,
            }}>
              {t('reports.noMenuItems')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: Colors.backgroundSecondary }}>
                  <th style={tableHeaderStyle}>Item</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>{t('reports.initialStock')}</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>{t('reports.soldItems')}</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>{t('reports.availableStock')}</th>
                  <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item, index) => {
                  const stockPercentage = item.isInfinite 
                    ? 100 
                    : item.initialStock > 0 
                      ? (item.available / item.initialStock) * 100 
                      : 0;
                  
                  let statusColor: string = Colors.success;
                  let statusText = 'OK';
                  
                  if (item.isInfinite) {
                    statusColor = Colors.secondary;
                    statusText = t('menu.infinite');
                  } else if (item.available === 0) {
                    statusColor = Colors.danger;
                    statusText = t('menu.soldOut');
                  } else if (stockPercentage < 20) {
                    statusColor = Colors.warning;
                    statusText = t('menu.low');
                  }

                  return (
                    <tr key={index} style={{ borderBottom: `1px solid ${Colors.border}` }}>
                      <td style={tableCellStyle}>
                        <div style={{ fontWeight: 500 }}>{item.description}</div>
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        {item.isInfinite ? '∞' : item.initialStock}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        {item.sold}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        {item.isInfinite ? '∞' : item.available}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `2px ${Spacing.sm}px`,
                          backgroundColor: statusColor,
                          color: Colors.textLight,
                          borderRadius: BorderRadius.sm,
                          fontSize: FontSizes.xs,
                          fontWeight: 500,
                        }}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Surplus/Shortage Analysis */}
      {report.items.some(item => !item.isInfinite && item.available > 0) && (
        <div style={{
          marginTop: Spacing.lg,
          padding: Spacing.md,
          backgroundColor: Colors.backgroundSecondary,
          borderRadius: BorderRadius.lg,
        }}>
          <h4 style={{
            margin: 0,
            marginBottom: Spacing.sm,
            fontSize: FontSizes.sm,
            fontWeight: 600,
            color: Colors.text,
          }}>
            {t('reports.leftovers')}
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
            {report.items
              .filter(item => !item.isInfinite && item.available > 0)
              .map((item, index) => (
                <span
                  key={index}
                  style={{
                    padding: `${Spacing.xs}px ${Spacing.sm}px`,
                    backgroundColor: Colors.background,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.md,
                    fontSize: FontSizes.sm,
                  }}
                >
                  {item.description}: <strong>{item.available}</strong>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Summary Card Component
const SummaryCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  color: string;
}> = ({ title, value, subtitle, color }) => (
  <div style={{
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    border: `1px solid ${Colors.border}`,
    textAlign: 'center',
  }}>
    <div style={{
      fontSize: FontSizes.xs,
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
    <div style={{
      fontSize: FontSizes.xs,
      color: Colors.textSecondary,
    }}>
      {subtitle}
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
