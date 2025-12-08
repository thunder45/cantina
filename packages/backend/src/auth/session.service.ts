import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { TokenResponse, ZohoUserInfo } from './zoho-oauth.service';

const TABLE_NAME = process.env.SESSIONS_TABLE;
const isProduction = !!TABLE_NAME;

let docClient: DynamoDBDocumentClient | null = null;
if (isProduction) {
  docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
}

// In-memory fallback for local dev
const sessions = new Map<string, Session>();

// Session TTL: 7 days
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface Session {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  createdAt: number;
  ttl?: number;
}

export async function createSession(user: ZohoUserInfo, tokens: TokenResponse): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: uuidv4(),
    userId: user.ZUID,
    email: user.Email,
    displayName: user.Display_Name || user.Email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    accessTokenExpiresAt: now + (tokens.expires_in * 1000),
    createdAt: now,
    ttl: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  };

  if (isProduction) {
    await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: session }));
  } else {
    sessions.set(session.id, session);
  }
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  if (isProduction) {
    const result = await docClient!.send(new GetCommand({ TableName: TABLE_NAME, Key: { id: sessionId } }));
    return (result.Item as Session) || null;
  }
  return sessions.get(sessionId) || null;
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  const session = await getSession(sessionId);
  if (session) {
    const updated = { ...session, ...updates };
    if (isProduction) {
      await docClient!.send(new PutCommand({ TableName: TABLE_NAME, Item: updated }));
    } else {
      sessions.set(sessionId, updated);
    }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isProduction) {
    await docClient!.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id: sessionId } }));
  } else {
    sessions.delete(sessionId);
  }
}

export function isAccessTokenExpired(session: Session): boolean {
  return Date.now() >= session.accessTokenExpiresAt - 60000;
}

export function getSessionUser(session: Session): { email: string; displayName: string } {
  return { email: session.email, displayName: session.displayName };
}

export function clearAllSessions(): void {
  sessions.clear();
}
