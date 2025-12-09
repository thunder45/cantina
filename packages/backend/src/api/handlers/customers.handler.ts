import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateName, parseBody } from '../validation';
import * as customerService from '../../services/customer.service';
import { PaymentMethod } from '@cantina-pos/shared';

interface CreateCustomerBody {
  name: string;
  creditLimit?: number;
}

interface TransactionBody {
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
}

interface UpdateCreditLimitBody {
  creditLimit: number;
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const { httpMethod, pathParameters, queryStringParameters, path } = event;
  const customerId = pathParameters?.id;
  const createdBy = 'system'; // TODO: get from auth context

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
    if (httpMethod === 'POST' && customerId && path.includes('/deposit')) {
      return await deposit(customerId, event, createdBy);
    }
    if (httpMethod === 'POST' && customerId && path.includes('/withdraw')) {
      return await withdraw(customerId, event, createdBy);
    }
    if (httpMethod === 'PATCH' && customerId && path.includes('/credit-limit')) {
      return await updateCreditLimit(customerId, event);
    }
    if (httpMethod === 'GET' && customerId) {
      return await getCustomer(customerId);
    }
    if (httpMethod === 'GET' && !customerId) {
      return await getAllCustomers();
    }
    return error('ERR_METHOD_NOT_ALLOWED', 'Método não permitido', 405);
  } catch (err) {
    return handleError(err);
  }
}

async function searchCustomers(query: string): Promise<APIGatewayResponse> {
  const customers = await customerService.getCustomersWithBalances();
  if (!query) return success(customers);
  const q = query.toLowerCase();
  return success(customers.filter(c => c.name.toLowerCase().includes(q)));
}

async function getAllCustomers(): Promise<APIGatewayResponse> {
  const customers = await customerService.getCustomersWithBalances();
  return success(customers);
}

async function createCustomer(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<CreateCustomerBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);

  const nameError = validateName(body.name, 'name');
  if (nameError) return error('ERR_VALIDATION', nameError.message, 400);

  const customer = await customerService.createCustomer(body.name.trim(), body.creditLimit);
  return created(customer);
}

async function getCustomer(customerId: string): Promise<APIGatewayResponse> {
  const customer = await customerService.getCustomerWithBalance(customerId);
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

async function deposit(customerId: string, event: APIGatewayEvent, createdBy: string): Promise<APIGatewayResponse> {
  const body = parseBody<TransactionBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  if (!body.amount || body.amount <= 0) return error('ERR_INVALID_AMOUNT', 'Valor inválido', 400);
  if (!body.paymentMethod) return error('ERR_INVALID_PAYMENT_METHOD', 'Método de pagamento obrigatório', 400);

  const tx = await customerService.deposit(customerId, body.amount, body.paymentMethod, createdBy, body.description);
  return created(tx);
}

async function withdraw(customerId: string, event: APIGatewayEvent, createdBy: string): Promise<APIGatewayResponse> {
  const body = parseBody<TransactionBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  if (!body.amount || body.amount <= 0) return error('ERR_INVALID_AMOUNT', 'Valor inválido', 400);
  if (!body.paymentMethod) return error('ERR_INVALID_PAYMENT_METHOD', 'Método de pagamento obrigatório', 400);

  const tx = await customerService.withdraw(customerId, body.amount, body.paymentMethod, createdBy, body.description);
  return created(tx);
}

async function updateCreditLimit(customerId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const body = parseBody<UpdateCreditLimitBody>(event.body);
  if (!body) return error('ERR_INVALID_BODY', 'Corpo da requisição inválido', 400);
  if (body.creditLimit === undefined || body.creditLimit < 0) {
    return error('ERR_INVALID_CREDIT_LIMIT', 'Limite de crédito inválido', 400);
  }

  const customer = await customerService.updateCreditLimit(customerId, body.creditLimit);
  return success(customer);
}
