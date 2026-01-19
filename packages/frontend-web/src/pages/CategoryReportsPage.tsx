import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EventCategory,
  ApiClient,
  ReportApiService,
  Colors,
  Spacing,
  FontSizes,
  BorderRadius,
} from '@cantina-pos/shared';
import { CategoryReportView } from '../components/reports';

interface CategoryReportsPageProps {
  apiClient: ApiClient;
  category: EventCategory;
  onBack?: () => void;
}

export const CategoryReportsPage: React.FC<CategoryReportsPageProps> = ({
  apiClient,
  category,
  onBack,
}) => {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const reportService = new ReportApiService(apiClient);

  const handleExportCSV = useCallback(async () => {
    try {
      setExporting(true);
      setExportError(null);
      const csvContent = await reportService.exportCategoryReportCSV(category.id);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-categoria-${category.name}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(t('errors.exportReport'));
      console.error('Failed to export CSV:', err);
    } finally {
      setExporting(false);
    }
  }, [category.id, category.name]);

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
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.md,
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: `${Spacing.sm}px ${Spacing.md}px`,
              backgroundColor: 'transparent',
              color: Colors.text,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.md,
              fontSize: FontSizes.sm,
              cursor: 'pointer',
            }}
          >
            ← {t('common.back')}
          </button>
        )}
        <div>
          <h2 style={{
            margin: 0,
            fontSize: FontSizes.lg,
            fontWeight: 600,
            color: Colors.text,
          }}>
            {t('reports.byCategory')}
          </h2>
          <p style={{
            margin: 0,
            marginTop: Spacing.xs,
            fontSize: FontSizes.sm,
            color: Colors.textSecondary,
          }}>
            {category.name}
          </p>
        </div>
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
            {t('common.close')}
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

      {/* Report Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: Colors.background,
      }}>
        <CategoryReportView
          apiClient={apiClient}
          category={category}
          onExportCSV={handleExportCSV}
        />
      </div>
    </div>
  );
};
