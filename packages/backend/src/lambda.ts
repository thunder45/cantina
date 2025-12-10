import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { router } from './api/router';
import { APIGatewayEvent } from './api/types';
import * as zohoOAuth from './auth/zoho-oauth.service';
import * as sessionService from './auth/session.service';
import { isAllowedDomain } from './auth/domain-validator';
import { loadAuthConfig, getAuthConfig } from './auth/config';

// Set environment for DynamoDB repositories
process.env.USE_DYNAMODB = 'true';

// Load secrets on cold start
const configPromise = loadAuthConfig();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

// Store state tokens temporarily (for CSRF protection)
const stateTokens = new Map<string, number>();

export const handler = async (
  event: APIGatewayProxyEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  // Ensure secrets are loaded
  await configPromise;
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const path = event.path.replace(/^\/prod/, ''); // Remove stage prefix if present
  
  // Handle auth routes
  if (path.startsWith('/api/auth/')) {
    return handleAuthRoute(path, event);
  }

  // Handle API routes via router
  return handleApiRoute(event);
};

async function handleAuthRoute(
  path: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const authConfig = getAuthConfig();
  const frontendUrl = authConfig.frontendUrl;
  
  try {
    const cookies = parseCookies(event.headers.Cookie || event.headers.cookie || '');
    
    // GET /api/auth/login - Returns Zoho OAuth URL
    if (path === '/api/auth/login' && event.httpMethod === 'GET') {
      const state = uuidv4();
      stateTokens.set(state, Date.now());
      const url = zohoOAuth.getAuthorizationUrl(state);
      return jsonResponse(200, { url });
    }
    
    // GET /api/auth/callback - OAuth callback from Zoho
    if (path === '/api/auth/callback' && event.httpMethod === 'GET') {
      const { code, state, error } = event.queryStringParameters || {};
      
      if (error) {
        return redirect(`${frontendUrl}/?error=${encodeURIComponent(error)}`);
      }
      
      if (!state || !stateTokens.has(state)) {
        return redirect(`${frontendUrl}/?error=invalid_state`);
      }
      stateTokens.delete(state);
      
      if (!code) {
        return redirect(`${frontendUrl}/?error=missing_code`);
      }
      
      // Exchange code for tokens
      const tokens = await zohoOAuth.exchangeCodeForTokens(code);
      const userInfo = await zohoOAuth.getUserInfo(tokens.access_token);
      
      // Validate email domain
      if (!isAllowedDomain(userInfo.Email)) {
        return redirect(`${frontendUrl}/?error=domain_not_allowed`);
      }
      
      // Create session
      const session = await sessionService.createSession(userInfo, tokens);
      
      // Redirect to frontend with session token in URL (frontend will store it)
      return {
        statusCode: 302,
        headers: {
          ...CORS_HEADERS,
          'Location': `${frontendUrl}?session=${session.id}`,
        },
        body: '',
      };
    }
    
    // GET /api/auth/me - Get current user
    if (path === '/api/auth/me' && event.httpMethod === 'GET') {
      const authHeader = event.headers.Authorization || event.headers.authorization || '';
      const sessionId = authHeader.replace('Bearer ', '') || cookies.session;
      if (!sessionId) {
        return jsonResponse(401, { error: 'Not authenticated' });
      }
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        return jsonResponse(401, { error: 'Session expired' });
      }
      return jsonResponse(200, { email: session.email, name: session.displayName });
    }
    
    // POST /api/auth/logout
    if (path === '/api/auth/logout' && event.httpMethod === 'POST') {
      const sessionId = cookies.session;
      if (sessionId) {
        await sessionService.deleteSession(sessionId);
      }
      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        },
        body: JSON.stringify({ success: true }),
      };
    }
    
    return jsonResponse(404, { error: 'Not found' });
  } catch (error) {
    console.error('Auth error:', error);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}

async function handleApiRoute(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

  // Get user from session
  const cookies = parseCookies(event.headers.Cookie || event.headers.cookie || '');
  const authHeader = event.headers.Authorization || event.headers.authorization || '';
  const sessionId = authHeader.replace('Bearer ', '') || cookies.cantina_session;
  let userEmail = 'anonymous';
  let userName = 'anonymous';
  if (sessionId) {
    const session = await sessionService.getSession(sessionId);
    if (session) {
      userEmail = session.email;
      userName = session.displayName || session.email;
    }
  }

  // Remove /api prefix for router
  const routerPath = event.path.replace(/^\/prod/, '').replace(/^\/api/, '');

  const internalEvent: APIGatewayEvent = {
    httpMethod: event.httpMethod,
    path: routerPath,
    pathParameters: pathParams,
    queryStringParameters: queryParams,
    body: event.body || undefined,
    headers: event.headers as Record<string, string>,
    requestContext: {
      authorizer: {
        claims: { email: userEmail, name: userName },
      },
    },
  };

  try {
    const response = await router(internalEvent);
    return {
      statusCode: response.statusCode,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...response.headers },
      body: response.body || '',
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return jsonResponse(500, { code: 'ERR_INTERNAL', message: 'Internal server error' });
  }
}

function jsonResponse(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

function redirect(location: string): APIGatewayProxyResult {
  return {
    statusCode: 302,
    headers: { ...CORS_HEADERS, 'Location': location },
    body: '',
  };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });
  return cookies;
}
