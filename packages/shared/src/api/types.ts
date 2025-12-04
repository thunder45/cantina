// API Client Types

export interface ApiConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  status: number;
}

export interface PendingOperation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
