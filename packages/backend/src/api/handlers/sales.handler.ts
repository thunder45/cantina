import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateId, validatePayments, validateName, parseBody } from '../validation';
import * as salesService from '../../services/sales.service';
import { PaymentPart } from '@cantina-pos/shared';

interface ConfirmSaleBody {
  orderId: string;
  payments: PaymentPart[];
  customerId?: string;
}

interface RefundSaleBody {
  reason: string;
}

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
  const body = parseBody<ConfirmSaleBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const orderIdError = validateId(body.orderId, 'orderId');
  if (orderIdError) return error('ERR_VALIDATION', orderIdError.message, 400);

  const paymentErrors = validatePayments(body.payments);
  if (paymentErrors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(paymentErrors.map(e => [e.field, e.message])));
  }

  if (body.customerId !== undefined && body.customerId !== null) {
    const customerIdError = validateId(body.customerId, 'customerId');
    if (customerIdError) return error('ERR_VALIDATION', customerIdError.message, 400);
  }

  const userId = getUserId(event);
  const sale = await salesService.confirmSale(body.orderId, body.payments, userId, body.customerId);
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
  const body = parseBody<RefundSaleBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const reasonError = validateName(body.reason, 'reason');
  if (reasonError) return error('ERR_VALIDATION', 'Motivo do estorno é obrigatório', 400);

  const userId = getUserId(event);
  const refund = await salesService.refundSale(saleId, body.reason, userId);
  return success(refund);
}
