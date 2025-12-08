import { getAuthConfig } from './config';

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

export function getAuthorizationUrl(state: string): string {
  const config = getAuthConfig();
  const params = new URLSearchParams({
    client_id: config.zoho.clientId,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    redirect_uri: config.zoho.redirectUri,
    access_type: 'offline',
    state,
    prompt: 'consent',
  });
  return `${config.zoho.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const config = getAuthConfig();
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
    redirect_uri: config.zoho.redirectUri,
    code,
  });

  const response = await fetch(config.zoho.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.error) throw new Error(`Zoho OAuth error: ${data.error}`);
  return data as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = getAuthConfig();
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.zoho.clientId,
    client_secret: config.zoho.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(config.zoho.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.error) throw new Error(`Zoho token refresh error: ${data.error}`);
  return data as TokenResponse;
}

export async function getUserInfo(accessToken: string): Promise<ZohoUserInfo> {
  const config = getAuthConfig();
  const response = await fetch(config.zoho.userInfoUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Failed to get user info: ${response.status}`);
  return response.json();
}

export async function revokeToken(token: string): Promise<void> {
  const config = getAuthConfig();
  const params = new URLSearchParams({ token });
  await fetch(config.zoho.revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}
