import React, { useState, useCallback } from 'react';
import {
  Event,
  ApiClient,
  ReportApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';
import { GlobalReportView, EventReportView, StockReportView } from '../components/reports';

interface ReportsPageProps {
  apiClient: ApiClient;
  event: Event | null;
}

type ReportTab = 'global' | 'event' | 'stock';

export const ReportsPage: React.FC<ReportsPageProps> = ({
  apiClient,
  event,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('global');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const reportService = new ReportApiService(apiClient);

  const handleExportCSV = useCallback(async () => {
    if (!event) return;
    try {
      setExporting(true);
      setExportError(null);
      const csvContent = await reportService.exportReportCSV(event.id);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-${event.name}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError('Erro ao exportar relatório');
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  }, [event]);

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
          Relatórios
        </h2>
        <p style={{
          margin: 0,
          marginTop: Spacing.xs,
          fontSize: FontSizes.sm,
          color: Colors.textSecondary,
        }}>
          {activeTab === 'global' ? 'Visão geral de todas as vendas' : event?.name || 'Selecione um evento'}
        </p>
      </div>

      {/* Export Error */}
      {exportError && (
        <div style={{
          padding: Spacing.sm,
          backgroundColor: Colors.danger,
          color: Colors.textLight,
          textAlign: 'center',
          fontSize: FontSizes.sm,
        }}>
          {exportError}
          <button
            onClick={() => setExportError(null)}
            style={{
              marginLeft: Spacing.md,
              background: 'none',
              border: 'none',
              color: Colors.textLight,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Exporting Indicator */}
      {exporting && (
        <div style={{
          padding: Spacing.sm,
          backgroundColor: Colors.primary,
          color: Colors.textLight,
          textAlign: 'center',
          fontSize: FontSizes.sm,
        }}>
          A exportar relatório...
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: Spacing.xs,
        padding: `${Spacing.sm}px ${Spacing.md}px`,
        backgroundColor: Colors.background,
        borderBottom: `1px solid ${Colors.border}`,
      }}>
        <button
          onClick={() => setActiveTab('global')}
          style={{
            padding: `${Spacing.sm}px ${Spacing.lg}px`,
            backgroundColor: activeTab === 'global' ? Colors.primary : 'transparent',
            color: activeTab === 'global' ? Colors.textLight : Colors.text,
            border: activeTab === 'global' ? 'none' : `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.md,
            fontSize: FontSizes.sm,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          📊 Geral
        </button>
        {event && (
          <>
            <button
              onClick={() => setActiveTab('event')}
              style={{
                padding: `${Spacing.sm}px ${Spacing.lg}px`,
                backgroundColor: activeTab === 'event' ? Colors.primary : 'transparent',
                color: activeTab === 'event' ? Colors.textLight : Colors.text,
                border: activeTab === 'event' ? 'none' : `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.sm,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📅 Evento
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              style={{
                padding: `${Spacing.sm}px ${Spacing.lg}px`,
                backgroundColor: activeTab === 'stock' ? Colors.primary : 'transparent',
                color: activeTab === 'stock' ? Colors.textLight : Colors.text,
                border: activeTab === 'stock' ? 'none' : `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.md,
                fontSize: FontSizes.sm,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              📦 Estoque
            </button>
          </>
        )}
      </div>

      {/* Report Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: Colors.background,
      }}>
        {activeTab === 'global' && (
          <GlobalReportView apiClient={apiClient} />
        )}
        {activeTab === 'event' && event && (
          <EventReportView apiClient={apiClient} event={event} onExportCSV={handleExportCSV} />
        )}
        {activeTab === 'stock' && event && (
          <StockReportView apiClient={apiClient} event={event} />
        )}
      </div>
    </div>
  );
};
