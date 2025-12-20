import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, handleError, error } from '../response';
import * as reportService from '../../services/report.service';
import { ReportFilter, GlobalReportFilter, PaymentMethod } from '@cantina-pos/shared';

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, queryStringParameters, path } = event;
  const id = pathParameters?.id;

  try {
    // Global report (no event required)
    if (httpMethod === 'GET' && path === '/reports/global') {
      const filter: GlobalReportFilter = {};
      if (queryStringParameters?.categoryId) filter.categoryId = queryStringParameters.categoryId;
      if (queryStringParameters?.eventId) filter.eventId = queryStringParameters.eventId;
      if (queryStringParameters?.startDate) filter.startDate = queryStringParameters.startDate;
      if (queryStringParameters?.endDate) filter.endDate = queryStringParameters.endDate;
      if (queryStringParameters?.paymentMethod) filter.paymentMethod = queryStringParameters.paymentMethod as PaymentMethod;
      if (queryStringParameters?.customerId) filter.customerId = queryStringParameters.customerId;
      return await getGlobalReport(filter);
    }

    if (path.includes('/categories/')) {
      if (httpMethod === 'GET' && id && path.includes('/report/export')) {
        return await exportCategoryReportCSV(id);
      }
      if (httpMethod === 'GET' && id && path.includes('/report')) {
        return await getCategoryReport(id);
      }
    }

    if (httpMethod === 'GET' && id && path.includes('/report/export')) {
      return await exportReportCSV(id);
    }
    if (httpMethod === 'GET' && id && path.includes('/stock-report')) {
      return await getStockReport(id);
    }
    if (httpMethod === 'GET' && id && path.includes('/report')) {
      const filter: ReportFilter = {};
      if (queryStringParameters?.category) filter.category = queryStringParameters.category;
      if (queryStringParameters?.startDate) filter.startDate = queryStringParameters.startDate;
      if (queryStringParameters?.endDate) filter.endDate = queryStringParameters.endDate;
      return await getEventReport(id, filter);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function getGlobalReport(filter?: GlobalReportFilter): Promise<APIGatewayResponse> {
  const report = await reportService.getGlobalReport(filter);
  return success(report);
}

async function getEventReport(eventId: string, filter?: ReportFilter): Promise<APIGatewayResponse> {
  const report = await reportService.getEventReport(eventId, filter);
  return success(report);
}

async function getStockReport(eventId: string): Promise<APIGatewayResponse> {
  const report = await reportService.getStockReport(eventId);
  return success(report);
}

async function exportReportCSV(eventId: string): Promise<APIGatewayResponse> {
  const csv = await reportService.exportReportCSV(eventId);
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

async function getCategoryReport(categoryId: string): Promise<APIGatewayResponse> {
  const report = await reportService.getCategoryReport(categoryId);
  return success(report);
}

async function exportCategoryReportCSV(categoryId: string): Promise<APIGatewayResponse> {
  const csv = await reportService.exportCategoryReportCSV(categoryId);
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
