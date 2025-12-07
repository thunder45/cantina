/**
 * Reports API Handler
 * Endpoints:
 * - GET /events/{id}/report - Get event report
 * - GET /events/{id}/stock-report - Get stock report
 * - GET /events/{id}/report/export - Export report as CSV
 * - GET /categories/{id}/report - Get category report (aggregated from all events)
 * - GET /categories/{id}/report/export - Export category report as CSV
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, handleError, error } from '../response';
import * as reportService from '../../services/report.service';
import { ReportFilter } from '@cantina-pos/shared';

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, queryStringParameters, path } = event;
  const id = pathParameters?.id;

  try {
    // Category report endpoints
    if (path.includes('/categories/')) {
      // GET /categories/{id}/report/export - Export category CSV
      if (httpMethod === 'GET' && id && path.includes('/report/export')) {
        return exportCategoryReportCSV(id);
      }

      // GET /categories/{id}/report - Get category report
      if (httpMethod === 'GET' && id && path.includes('/report')) {
        return getCategoryReport(id);
      }
    }

    // Event report endpoints
    // GET /events/{id}/report/export - Export CSV
    if (httpMethod === 'GET' && id && path.includes('/report/export')) {
      return exportReportCSV(id);
    }

    // GET /events/{id}/stock-report - Get stock report
    if (httpMethod === 'GET' && id && path.includes('/stock-report')) {
      return getStockReport(id);
    }

    // GET /events/{id}/report - Get event report
    if (httpMethod === 'GET' && id && path.includes('/report')) {
      const filter: ReportFilter = {};
      if (queryStringParameters?.category) {
        filter.category = queryStringParameters.category;
      }
      if (queryStringParameters?.startDate) {
        filter.startDate = queryStringParameters.startDate;
      }
      if (queryStringParameters?.endDate) {
        filter.endDate = queryStringParameters.endDate;
      }
      return getEventReport(id, filter);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function getEventReport(eventId: string, filter?: ReportFilter): APIGatewayResponse {
  const report = reportService.getEventReport(eventId, filter);
  return success(report);
}

function getStockReport(eventId: string): APIGatewayResponse {
  const report = reportService.getStockReport(eventId);
  return success(report);
}

function exportReportCSV(eventId: string): APIGatewayResponse {
  const csv = reportService.exportReportCSV(eventId);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${eventId}.csv"`,
      'Access-Control-Allow-Origin': '*',
    },
    body: csv,
  };
}

function getCategoryReport(categoryId: string): APIGatewayResponse {
  const report = reportService.getCategoryReport(categoryId);
  return success(report);
}

function exportCategoryReportCSV(categoryId: string): APIGatewayResponse {
  const csv = reportService.exportCategoryReportCSV(categoryId);
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="category-report-${categoryId}.csv"`,
      'Access-Control-Allow-Origin': '*',
    },
    body: csv,
  };
}
