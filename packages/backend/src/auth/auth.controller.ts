import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as zohoOAuth from './zoho-oauth.service';
import * as sessionService from './session.service';
import { isAllowedDomain } from './domain-validator';
import { setSessionCookie, clearSessionCookie } from './auth.middleware';
import { authConfig } from './config';

const stateTokens = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [state, timestamp] of stateTokens) {
    if (now - timestamp > 5 * 60 * 1000) stateTokens.delete(state);
  }
}, 60 * 1000);

const frontendUrl = authConfig.frontendUrl;

export function getLoginUrl(req: Request, res: Response): void {
  const state = uuidv4();
  stateTokens.set(state, Date.now());
  const url = zohoOAuth.getAuthorizationUrl(state);
  res.json({ url });
}

export async function handleCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query;

  if (error) {
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error as string)}`);
    return;
  }

  if (!state || !stateTokens.has(state as string)) {
    res.redirect(`${frontendUrl}/?error=invalid_state`);
    return;
  }
  stateTokens.delete(state as string);

  if (!code || typeof code !== 'string') {
    res.redirect(`${frontendUrl}/?error=missing_code`);
    return;
  }

  try {
    const tokens = await zohoOAuth.exchangeCodeForTokens(code);
    const userInfo = await zohoOAuth.getUserInfo(tokens.access_token);

    if (!isAllowedDomain(userInfo.Email)) {
      res.redirect(`${frontendUrl}/?error=domain_not_allowed`);
      return;
    }

    const session = await sessionService.createSession(userInfo, tokens);
    setSessionCookie(res, session.id);
    res.redirect(frontendUrl);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
}

export function getCurrentUser(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Not authenticated' });
    return;
  }
  res.json({ user: req.user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const sessionId = req.sessionId;

  if (sessionId) {
    const session = await sessionService.getSession(sessionId);
    if (session?.refreshToken) {
      try {
        await zohoOAuth.revokeToken(session.refreshToken);
      } catch (err) {
        console.error('Failed to revoke token:', err);
      }
    }
    await sessionService.deleteSession(sessionId);
  }

  clearSessionCookie(res);
  res.json({ success: true });
}
