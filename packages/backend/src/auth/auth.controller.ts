import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as zohoOAuth from './zoho-oauth.service';
import * as sessionService from './session.service';
import { isAllowedDomain } from './domain-validator';
import { setSessionCookie, clearSessionCookie } from './auth.middleware';
import { authConfig } from './config';

// Store state tokens temporarily (for CSRF protection)
const stateTokens = new Map<string, number>();

// Clean up expired state tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, timestamp] of stateTokens) {
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutes
      stateTokens.delete(state);
    }
  }
}, 60 * 1000);

const frontendUrl = authConfig.frontendUrl;

/**
 * GET /api/auth/login
 * Returns Zoho OAuth authorization URL
 */
export function getLoginUrl(req: Request, res: Response): void {
  const state = uuidv4();
  stateTokens.set(state, Date.now());
  
  const url = zohoOAuth.getAuthorizationUrl(state);
  res.json({ url });
}

/**
 * GET /api/auth/callback
 * Handles OAuth callback from Zoho
 */
export async function handleCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query;

  // Handle Zoho errors
  if (error) {
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error as string)}`);
    return;
  }

  // Validate state token (CSRF protection)
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
    // Exchange code for tokens
    const tokens = await zohoOAuth.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await zohoOAuth.getUserInfo(tokens.access_token);

    // Validate email domain
    if (!isAllowedDomain(userInfo.Email)) {
      res.redirect(`${frontendUrl}/?error=domain_not_allowed`);
      return;
    }

    // Create session
    const session = sessionService.createSession(userInfo, tokens);

    // Set session cookie
    setSessionCookie(res, session.id);

    // Redirect to frontend
    res.redirect(frontendUrl);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${frontendUrl}/?error=auth_failed`);
  }
}

/**
 * GET /api/auth/me
 * Returns current user info
 */
export function getCurrentUser(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Not authenticated' });
    return;
  }

  res.json({ user: req.user });
}

/**
 * POST /api/auth/logout
 * Ends user session
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const sessionId = req.sessionId;

  if (sessionId) {
    const session = sessionService.getSession(sessionId);
    
    // Revoke tokens at Zoho
    if (session?.refreshToken) {
      try {
        await zohoOAuth.revokeToken(session.refreshToken);
      } catch (err) {
        console.error('Failed to revoke token:', err);
      }
    }

    // Delete local session
    sessionService.deleteSession(sessionId);
  }

  // Clear cookie
  clearSessionCookie(res);

  res.json({ success: true });
}
