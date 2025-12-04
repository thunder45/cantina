/**
 * Customers API Handler
 * Endpoints:
 * - GET /customers/search?q={query} - Search customers
 * - POST /customers - Create customer
 * - GET /customers/{id} - Get customer
 * - GET /customers/{id}/balance - Get customer balance
 * - GET /customers/{id}/history - Get customer history
 * - POST /customers/{id}/payments - Register payment
 */
import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateName, validatePayments, parseBody } from '../validation';
import * as customerService from '../../services/customer.service';
import { PaymentPart } from '@cantina-pos/shared';

interface CreateCustomerBody {
  name: string;
}

interface RegisterPaymentBody {
  payments: PaymentPart[];
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, queryStringParameters, path } = event;
  const customerId = pathParameters?.id;

  try {
    // GET /customers/search - Search customers
    if (httpMethod === 'GET' && path.includes('/search')) {
      return searchCustomers(queryStringParameters?.q || '');
    }

    // POST /customers - Create customer
    if (httpMethod === 'POST' && !customerId) {
      return createCustomer(event);
    }

    // GET /customers/{id}/balance - Get balance
    if (httpMethod === 'GET' && customerId && path.includes('/balance')) {
      return getCustomerBalance(customerId);
    }

    // GET /customers/{id}/history - Get history
    if (httpMethod === 'GET' && customerId && path.includes('/history')) {
      return getCustomerHistory(customerId);
    }

    // POST /customers/{id}/payments - Register payment
    if (httpMethod === 'POST' && customerId && path.includes('/payments')) {
      return registerPayment(customerId, event);
    }

    // GET /customers/{id} - Get customer
    if (httpMethod === 'GET' && customerId) {
      return getCustomer(customerId);
    }

    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

function searchCustomers(query: string): APIGatewayResponse {
  const customers = customerService.searchCustomers(query);
  return success(customers);
}

function createCustomer(event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<CreateCustomerBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const nameError = validateName(body.name, 'name');
  if (nameError) {
    return error('ERR_VALIDATION', nameError.message, 400);
  }

  const customer = customerService.createCustomer(body.name.trim());
  return created(customer);
}

function getCustomer(customerId: string): APIGatewayResponse {
  const customer = customerService.getCustomer(customerId);
  return success(customer);
}

function getCustomerBalance(customerId: string): APIGatewayResponse {
  const balance = customerService.getCustomerBalance(customerId);
  return success({ customerId, balance });
}

function getCustomerHistory(customerId: string): APIGatewayResponse {
  const history = customerService.getCustomerHistory(customerId);
  return success(history);
}

function registerPayment(customerId: string, event: APIGatewayEvent): APIGatewayResponse {
  const body = parseBody<RegisterPaymentBody>(event.body);
  if (!body) {
    return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  }

  const paymentErrors = validatePayments(body.payments);
  if (paymentErrors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(paymentErrors.map(e => [e.field, e.message]))
    );
  }

  // Filter out credit payments (not allowed for customer payments)
  const validPayments = body.payments.filter(p => p.method !== 'credit');
  if (validPayments.length === 0) {
    return error('ERR_INVALID_PAYMENT_METHOD', 'Crédito não é permitido para pagamentos de clientes', 400);
  }

  const payment = customerService.registerPayment(customerId, validPayments);
  return created(payment);
}
