import { v4 as uuidv4 } from 'uuid';
import { TokenResponse, ZohoUserInfo } from './zoho-oauth.service';

export interface Session {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  createdAt: number;
}

// In-memory session store (for MVP - migrate to DynamoDB for production)
const sessions = new Map<string, Session>();

/**
 * Creates a new session for authenticated user
 */
export function createSession(user: ZohoUserInfo, tokens: TokenResponse): Session {
  const session: Session = {
    id: uuidv4(),
    userId: user.ZUID,
    email: user.Email,
    displayName: user.Display_Name || user.Email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    accessTokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
    createdAt: Date.now(),
  };

  sessions.set(session.id, session);
  return session;
}

/**
 * Gets session by ID
 */
export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) || null;
}

/**
 * Updates session with new data
 */
export function updateSession(sessionId: string, updates: Partial<Session>): void {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.set(sessionId, { ...session, ...updates });
  }
}

/**
 * Deletes session
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Checks if access token is expired
 */
export function isAccessTokenExpired(session: Session): boolean {
  // Add 60 second buffer to avoid edge cases
  return Date.now() >= session.accessTokenExpiresAt - 60000;
}

/**
 * Gets user info from session (safe to expose to frontend)
 */
export function getSessionUser(session: Session): { email: string; displayName: string } {
  return {
    email: session.email,
    displayName: session.displayName,
  };
}

/**
 * Clears all sessions (for testing)
 */
export function clearAllSessions(): void {
  sessions.clear();
}
