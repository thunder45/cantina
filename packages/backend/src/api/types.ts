/**
 * API Types for Lambda handlers
 */

export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  headers: Record<string, string>;
  requestContext: {
    authorizer?: {
      claims?: {
        sub?: string;
        'cognito:username'?: string;
        email?: string;
        name?: string;
      };
    };
  };
}

export interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface HandlerContext {
  userId: string;
}

export type LambdaHandler = (event: APIGatewayEvent) => Promise<APIGatewayResponse>;
