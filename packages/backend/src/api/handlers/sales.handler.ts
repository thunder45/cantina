/**
 * Sales API Handler
 * Endpoints:
 * - POST /sales - Confirm sale
 * - GET /events/{id}/sales - List sales for event
 * - GET /sales/{id}/receipt - Get receipt
 * - POST /sales/{id}/refund - Refund sale
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateId, validatePayments, validateName, parseBody, combineValidationErrors } from '../validation';
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

/**
 * Get user ID from event context (Cognito)
 */
function getUserId(event: APIGatewayEvent): string {
  const claims = event.requestContext?.authorizer?.claims;
  return claims?.sub || claims?.['cognito:username'] || 'anonymous';
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, path } = event;
  const eventId = pathParameters?.id;
  const saleId = pathParameters?.saleId;

  try {
    // POST /sales - Confirm sale
    if (httpMethod === 'POST' && path === '/sales') {
      return confirmSale(event);
    }

    // GET /events/{id}/sales - List sales for event
    if (httpMethod === 'GET' && eventId && path.includes('/sales')) {
      return listSalesByEvent(eventId);
    }

    // GET /sales/{id}/receipt - Get receipt
    if (httpMethod === 'GET' && saleId && path.includes('/receipt')) {
      return getReceipt(saleId);
    }

    // GET /sales/{id} - Get sale
    if (httpMethod === 'GET' && saleId && !path.includes('/receipt')) {
      return getSale(saleId);
    }

    // POST /sales/{id}/refund - Refund sale
    if (httpMethod === 'POST' && saleId && path.includes('/refund')) {
      return refundSale(saleId, event);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function confirmSale(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<ConfirmSaleBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const orderIdError = validateId(body.orderId, 'orderId');
  if (orderIdError) {
    return error('ERR_VALIDATION', orderIdError.message, 400);
  }

  const paymentErrors = validatePayments(body.payments);
  if (paymentErrors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(paymentErrors.map(e => [e.field, e.message]))
    );
  }

  // Validate customerId if provided
  if (body.customerId !== undefined && body.customerId !== null) {
    const customerIdError = validateId(body.customerId, 'customerId');
    if (customerIdError) {
      return error('ERR_VALIDATION', customerIdError.message, 400);
    }
  }

  const userId = getUserId(event);
  const sale = salesService.confirmSale(
    body.orderId,
    body.payments,
    userId,
    body.customerId
  );

  return created(sale);
}

function listSalesByEvent(eventId: string): APIGatewayResponse {
  const sales = salesService.getSalesByEvent(eventId);
  return success(sales);
}

function getSale(saleId: string): APIGatewayResponse {
  const sale = salesService.getSale(saleId);
  return success(sale);
}

function getReceipt(saleId: string): APIGatewayResponse {
  const receipt = salesService.getReceipt(saleId);
  return success(receipt);
}

function refundSale(saleId: string, event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<RefundSaleBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const reasonError = validateName(body.reason, 'reason');
  if (reasonError) {
    return error('ERR_VALIDATION', 'Motivo do estorno é obrigatório', 400);
  }

  const userId = getUserId(event);
  const refund = salesService.refundSale(saleId, body.reason, userId);

  return success(refund);
}
