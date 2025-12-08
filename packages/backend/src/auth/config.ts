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
    maxAge: number;
  };
  allowedEmailDomain: string;
  frontendUrl: string;
  isProduction: boolean;
}

let cachedConfig: AuthConfig | null = null;
let secretLoaded = false;

function getBaseConfig(): AuthConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    zoho: {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      redirectUri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
      authUrl: 'https://accounts.zoho.eu/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.eu/oauth/v2/token',
      userInfoUrl: 'https://accounts.zoho.eu/oauth/user/info',
      revokeUrl: 'https://accounts.zoho.eu/oauth/v2/token/revoke',
    },
    session: {
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      cookieName: 'cantina_session',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || 'advm.lu',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    isProduction,
  };
}

export async function loadAuthConfig(): Promise<AuthConfig> {
  if (cachedConfig && secretLoaded) return cachedConfig;
  
  cachedConfig = getBaseConfig();
  
  // Load secret from Secrets Manager in production
  const secretArn = process.env.ZOHO_SECRET_ARN;
  if (secretArn && cachedConfig.isProduction) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      const client = new SecretsManagerClient({});
      const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        cachedConfig.zoho.clientSecret = secret.client_secret;
      }
      secretLoaded = true;
    } catch (error) {
      console.error('Failed to load Zoho secret from Secrets Manager:', error);
    }
  }
  
  return cachedConfig;
}

// Sync version for backward compatibility (uses cached or base config)
export function getAuthConfig(): AuthConfig {
  return cachedConfig || getBaseConfig();
}

export const authConfig = getBaseConfig();
