/**
 * API Response utilities
 */
import { ErrorResponse, ErrorCodes } from '@cantina-pos/shared';
import { APIGatewayResponse } from './types';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

/**
 * Create a success response
 */
export function success<T>(data: T, statusCode = 200): APIGatewayResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

/**
 * Create a created response (201)
 */
export function created<T>(data: T): APIGatewayResponse {
  return success(data, 201);
}

/**
 * Create a no content response (204)
 */
export function noContent(): APIGatewayResponse {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}

/**
 * Create an error response
 */
export function error(
  code: string,
  message: string,
  statusCode = 400,
  details?: Record<string, string>
): APIGatewayResponse {
  const errorResponse: ErrorResponse = { code, message };
  if (details) {
    errorResponse.details = details;
  }
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(errorResponse),
  };
}

/**
 * Map error codes to HTTP status codes and messages
 */
const ERROR_MAP: Record<string, { status: number; message: string }> = {
  ERR_EVENT_NOT_FOUND: { status: 404, message: ErrorCodes.ERR_EVENT_NOT_FOUND },
  ERR_CUSTOMER_NOT_FOUND: { status: 404, message: ErrorCodes.ERR_CUSTOMER_NOT_FOUND },
  ERR_ORDER_NOT_FOUND: { status: 404, message: 'Pedido não encontrado' },
  ERR_SALE_NOT_FOUND: { status: 404, message: 'Venda não encontrada' },
  ERR_MENU_ITEM_NOT_FOUND: { status: 404, message: 'Item do menu não encontrado' },
  ERR_CATALOG_ITEM_NOT_FOUND: { status: 404, message: 'Item do catálogo não encontrado' },
  ERR_GROUP_NOT_FOUND: { status: 404, message: 'Grupo não encontrado' },
  ERR_STOCK_INSUFFICIENT: { status: 400, message: ErrorCodes.ERR_STOCK_INSUFFICIENT },
  ERR_DUPLICATE_NAME: { status: 409, message: ErrorCodes.ERR_DUPLICATE_NAME },
  ERR_INVALID_PRICE: { status: 400, message: ErrorCodes.ERR_INVALID_PRICE },
  ERR_EMPTY_NAME: { status: 400, message: ErrorCodes.ERR_EMPTY_NAME },
  ERR_INVALID_QUANTITY: { status: 400, message: ErrorCodes.ERR_INVALID_QUANTITY },
  ERR_SALE_ALREADY_REFUNDED: { status: 400, message: ErrorCodes.ERR_SALE_ALREADY_REFUNDED },
  ERR_GROUP_HAS_ITEMS: { status: 400, message: ErrorCodes.ERR_GROUP_HAS_ITEMS },
  ERR_PAYMENT_MISMATCH: { status: 400, message: ErrorCodes.ERR_PAYMENT_MISMATCH },
  ERR_ORDER_NOT_PENDING: { status: 400, message: 'Pedido não está pendente' },
  ERR_ORDER_EMPTY: { status: 400, message: 'Pedido está vazio' },
  ERR_NO_PAYMENT: { status: 400, message: 'Nenhum pagamento informado' },
  ERR_INVALID_PAYMENT_AMOUNT: { status: 400, message: 'Valor de pagamento inválido' },
  ERR_CUSTOMER_REQUIRED_FOR_CREDIT: { status: 400, message: 'Cliente obrigatório para pagamento a crédito' },
  ERR_EMPTY_REFUND_REASON: { status: 400, message: 'Motivo do estorno é obrigatório' },
  ERR_PAYMENT_EXCEEDS_BALANCE: { status: 400, message: 'Pagamento excede o saldo pendente' },
  ERR_INVALID_PAYMENT_METHOD: { status: 400, message: 'Método de pagamento inválido' },
};

/**
 * Handle service errors and return appropriate API response
 */
export function handleError(err: unknown): APIGatewayResponse {
  if (err instanceof Error) {
    const errorInfo = ERROR_MAP[err.message];
    if (errorInfo) {
      return error(err.message, errorInfo.message, errorInfo.status);
    }
    // Unknown error
    console.error('Unhandled error:', err);
    return error('ERR_INTERNAL', err.message, 500);
  }
  console.error('Unknown error type:', err);
  return error('ERR_INTERNAL', 'Erro interno do servidor', 500);
}
