import * as dotenv from 'dotenv';
dotenv.config();

export interface AuthConfig {
  zoho: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    revokeUrl: string;
  };
  session: {
    secret: string;
    cookieName: string;
    maxAge: number; // milliseconds
  };
  allowedEmailDomain: string;
  frontendUrl: string;
  isProduction: boolean;
}

const requiredEnvVars = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REDIRECT_URI', 'SESSION_SECRET'];

export function getAuthConfig(): AuthConfig {
  // Only validate in non-test environment
  if (process.env.NODE_ENV !== 'test') {
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    zoho: {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      redirectUri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
      // EU datacenter endpoints
      authUrl: 'https://accounts.zoho.eu/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.eu/oauth/v2/token',
      userInfoUrl: 'https://accounts.zoho.eu/oauth/user/info',
      revokeUrl: 'https://accounts.zoho.eu/oauth/v2/token/revoke',
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      cookieName: 'cantina_session',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || 'advm.lu',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    isProduction,
  };
}

export const authConfig = getAuthConfig();
