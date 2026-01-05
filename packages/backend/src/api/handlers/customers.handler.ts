import { APIGatewayEvent, APIGatewayResponse } from '../types';
import { success, created, handleError, error } from '../response';
import { validateBody } from '../validation';
import { CreateCustomerSchema, UpdateCustomerSchema, TransactionSchema } from '../schemas';
import * as customerService from '../../services/customer.service';

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
      return await getCustomerHistory(customerId, queryStringParameters || undefined);
    }
    if (httpMethod === 'POST' && customerId && path.includes('/deposit')) {
      return await deposit(customerId, event, createdBy);
    }
    if (httpMethod === 'POST' && customerId && path.includes('/withdraw')) {
      return await withdraw(customerId, event, createdBy);
    }
    if (httpMethod === 'PATCH' && customerId) {
      return await updateCustomer(customerId, event);
    }
    if (httpMethod === 'DELETE' && customerId) {
      return await deleteCustomer(customerId);
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
  const v = validateBody(event.body, CreateCustomerSchema);
  if (!v.success) return v.response;
  const customer = await customerService.createCustomer(v.data.name, v.data.initialBalance);
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

async function getCustomerHistory(customerId: string, queryParams?: Record<string, string>): Promise<APIGatewayResponse> {
  const filter = queryParams ? {
    categoryId: queryParams.categoryId,
    startDate: queryParams.startDate,
    endDate: queryParams.endDate,
  } : undefined;
  const history = await customerService.getCustomerHistory(customerId, filter);
  return success(history);
}

async function deposit(customerId: string, event: APIGatewayEvent, createdBy: string): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, TransactionSchema);
  if (!v.success) return v.response;
  const tx = await customerService.deposit(customerId, v.data.amount, v.data.paymentMethod, createdBy, v.data.description);
  return created(tx);
}

async function withdraw(customerId: string, event: APIGatewayEvent, createdBy: string): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, TransactionSchema);
  if (!v.success) return v.response;
  const tx = await customerService.withdraw(customerId, v.data.amount, v.data.paymentMethod, createdBy, v.data.description);
  return created(tx);
}

async function updateCustomer(customerId: string, event: APIGatewayEvent): Promise<APIGatewayResponse> {
  const v = validateBody(event.body, UpdateCustomerSchema);
  if (!v.success) return v.response;
  const customer = await customerService.updateCustomer(customerId, v.data);
  return success(customer);
}

async function deleteCustomer(customerId: string): Promise<APIGatewayResponse> {
  await customerService.deleteCustomer(customerId);
  return success({ deleted: true });
}
