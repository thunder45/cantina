import { authConfig } from './config';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

export interface ZohoUserInfo {
  ZUID: string;
  Email: string;
  Display_Name: string;
  First_Name?: string;
  Last_Name?: string;
}

const OAUTH_SCOPE = 'AaaServer.profile.Read';

/**
 * Generates the Zoho OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: authConfig.zoho.clientId,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    redirect_uri: authConfig.zoho.redirectUri,
    access_type: 'offline',
    state,
    prompt: 'consent',
  });

  return `${authConfig.zoho.authUrl}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: authConfig.zoho.clientId,
    client_secret: authConfig.zoho.clientSecret,
    redirect_uri: authConfig.zoho.redirectUri,
    code,
  });

  const response = await fetch(authConfig.zoho.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Zoho OAuth error: ${data.error}`);
  }

  return data as TokenResponse;
}

/**
 * Refreshes access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: authConfig.zoho.clientId,
    client_secret: authConfig.zoho.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(authConfig.zoho.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Zoho token refresh error: ${data.error}`);
  }

  return data as TokenResponse;
}

/**
 * Gets user info from Zoho using access token
 */
export async function getUserInfo(accessToken: string): Promise<ZohoUserInfo> {
  const response = await fetch(authConfig.zoho.userInfoUrl, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json();
}

/**
 * Revokes a token (access or refresh)
 */
export async function revokeToken(token: string): Promise<void> {
  const params = new URLSearchParams({ token });

  await fetch(authConfig.zoho.revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}
