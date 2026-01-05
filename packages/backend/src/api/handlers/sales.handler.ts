import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateBody } from '../validation';
import { ConfirmSaleSchema, RefundSaleSchema } from '../schemas';
import * as salesService from '../../services/sales.service';

function getUserId(event: APIGatewayEvent): string {
  const claims = event.requestContext?.authorizer?.claims;
  return claims?.name || claims?.email || 'anonymous';
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const eventId = pathParameters?.id;
  const saleId = pathParameters?.saleId;

  try {
    if (httpMethod === 'POST' && path === '/sales') {
      return await confirmSale(event);
    }
    if (httpMethod === 'GET' && eventId && path.includes('/sales')) {
      return await listSalesByEvent(eventId);
    }
    if (httpMethod === 'GET' && saleId && path.includes('/receipt')) {
      return await getReceipt(saleId);
    }
    if (httpMethod === 'GET' && saleId && !path.includes('/receipt')) {
      return await getSale(saleId);
    }
    if (httpMethod === 'POST' && saleId && path.includes('/refund')) {
      return await refundSale(saleId, event);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function confirmSale(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, ConfirmSaleSchema);
  if (!v.success) return v.response;
  const userId = getUserId(event);
  const sale = await salesService.confirmSale(v.data.orderId, v.data.payments, userId, v.data.customerId);
  return created(sale);
}

async function listSalesByEvent(eventId: string): Promise<APIGatewayResponse> {
  const sales = await salesService.getSalesByEvent(eventId);
  return success(sales);
}

async function getSale(saleId: string): Promise<APIGatewayResponse> {
  const sale = await salesService.getSale(saleId);
  return success(sale);
}

async function getReceipt(saleId: string): Promise<APIGatewayResponse> {
  const receipt = await salesService.getReceipt(saleId);
  return success(receipt);
}

async function refundSale(saleId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, RefundSaleSchema);
  if (!v.success) return v.response;
  const userId = getUserId(event);
  const refund = await salesService.refundSale(saleId, v.data.reason, userId);
  return success(refund);
}
