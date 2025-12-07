import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { router } from './api/router';
import { APIGatewayEvent } from './api/types';

// Set environment for DynamoDB repositories
process.env.USE_DYNAMODB = 'true';

export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Convert AWS event to our internal format
  const pathParams: Record<string, string> = {};
  if (event.pathParameters) {
    Object.entries(event.pathParameters).forEach(([k, v]) => {
      if (v) pathParams[k] = v;
    });
  }

  const queryParams: Record<string, string> = {};
  if (event.queryStringParameters) {
    Object.entries(event.queryStringParameters).forEach(([k, v]) => {
      if (v) queryParams[k] = v;
    });
  }

  const internalEvent: APIGatewayEvent = {
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: pathParams,
    queryStringParameters: queryParams,
    body: event.body || undefined,
    headers: event.headers as Record<string, string>,
    requestContext: {
      authorizer: {
        claims: event.requestContext.authorizer?.claims || {},
      },
    },
  };

  try {
    const response = await router(internalEvent);
    
    return {
      statusCode: response.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        ...response.headers,
      },
      body: response.body || '',
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      },
      body: JSON.stringify({
        code: 'ERR_INTERNAL',
        message: 'Internal server error',
      }),
    };
  }
};
