import { Request, Response, NextFunction } from 'express';
import { authConfig } from './config';
import * as sessionService from './session.service';
import * as zohoOAuth from './zoho-oauth.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { email: string; displayName: string };
      sessionId?: string;
    }
  }
}

/**
 * Middleware that requires valid authentication
 * Returns 401 if not authenticated
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.[authConfig.session.cookieName];

  if (!sessionId) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    return;
  }

  const session = await sessionService.getSession(sessionId);

  if (!session) {
    res.status(401).json({ code: 'SESSION_NOT_FOUND', message: 'Session not found' });
    return;
  }

  // Check if access token is expired and refresh if needed
  if (sessionService.isAccessTokenExpired(session)) {
    if (!session.refreshToken) {
      await sessionService.deleteSession(sessionId);
      res.status(401).json({ code: 'SESSION_EXPIRED', message: 'Session expired' });
      return;
    }

    try {
      const tokens = await zohoOAuth.refreshAccessToken(session.refreshToken);
      await sessionService.updateSession(sessionId, {
        accessToken: tokens.access_token,
        accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
      });
    } catch (error) {
      await sessionService.deleteSession(sessionId);
      res.status(401).json({ code: 'SESSION_EXPIRED', message: 'Failed to refresh session' });
      return;
    }
  }

  // Attach user info to request
  req.user = sessionService.getSessionUser(session);
  req.sessionId = sessionId;
  next();
}

/**
 * Sets session cookie with secure attributes
 */
export function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(authConfig.session.cookieName, sessionId, {
    httpOnly: true,
    secure: authConfig.isProduction,
    sameSite: 'strict',
    maxAge: authConfig.session.maxAge,
    path: '/',
  });
}

/**
 * Clears session cookie
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(authConfig.session.cookieName, {
    httpOnly: true,
    secure: authConfig.isProduction,
    sameSite: 'strict',
    path: '/',
  });
}
