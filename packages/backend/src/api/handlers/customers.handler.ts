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
    if (httpMethod === 'GET' && path.includes('/search')) {
      return await searchCustomers(queryStringParameters?.q || '');
    }
    if (httpMethod === 'POST' && !customerId) {
      return await createCustomer(event);
    }
    if (httpMethod === 'GET' && customerId && path.includes('/balance')) {
      return await getCustomerBalance(customerId);
    }
    if (httpMethod === 'GET' && customerId && path.includes('/history')) {
      return await getCustomerHistory(customerId);
    }
    if (httpMethod === 'POST' && customerId && path.includes('/payments')) {
      return await registerPayment(customerId, event);
    }
    if (httpMethod === 'GET' && customerId) {
      return await getCustomer(customerId);
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function searchCustomers(query: string): Promise<APIGatewayResponse> {
  const customers = await customerService.searchCustomers(query);
  return success(customers);
}

async function createCustomer(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CreateCustomerBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const nameError = validateName(body.name, 'name');
  if (nameError) return error('ERR_VALIDATION', nameError.message, 400);

  const customer = await customerService.createCustomer(body.name.trim());
  return created(customer);
}

async function getCustomer(customerId: string): Promise<APIGatewayResponse> {
  const customer = await customerService.getCustomer(customerId);
  return success(customer);
}

async function getCustomerBalance(customerId: string): Promise<APIGatewayResponse> {
  const balance = await customerService.getCustomerBalance(customerId);
  return success({ customerId, balance });
}

async function getCustomerHistory(customerId: string): Promise<APIGatewayResponse> {
  const history = await customerService.getCustomerHistory(customerId);
  return success(history);
}

async function registerPayment(customerId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<RegisterPaymentBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const paymentErrors = validatePayments(body.payments);
  if (paymentErrors.length > 0) {
    return error('ERR_VALIDATION', 'Erro de validação', 400,
      Object.fromEntries(paymentErrors.map(e => [e.field, e.message])));
  }

  const validPayments = body.payments.filter(p => p.method !== 'credit');
  if (validPayments.length === 0) {
    return error('ERR_INVALID_PAYMENT_METHOD', 'Crédito não é permitido para pagamentos de clientes', 400);
  }

  const payment = await customerService.registerPayment(customerId, validPayments);
  return created(payment);
}
