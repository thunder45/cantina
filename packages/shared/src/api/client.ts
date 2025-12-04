import { ApiConfig, ApiError, ApiResponse, RequestMethod, PendingOperation } from './types';

export class ApiClient {
  private config: ApiConfig;
  private pendingOperations: PendingOperation[] = [];
  private isOnline: boolean = true;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.processPendingOperations();
    }
  }

  async request<T>(
    method: RequestMethod,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // If offline and it's a write operation, queue it
    if (!this.isOnline && method !== 'GET') {
      this.queueOperation(method, endpoint, body);
      throw new OfflineError('Operation queued for sync');
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401) {
        this.config.onUnauthorized?.();
        throw new ApiClientError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          status: 401,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiClientError({
          code: errorData.code || 'API_ERROR',
          message: errorData.message || 'Request failed',
          details: errorData.details,
          status: response.status,
        });
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      if (error instanceof ApiClientError || error instanceof OfflineError) {
        throw error;
      }
      // Network error - queue if write operation
      if (method !== 'GET') {
        this.queueOperation(method, endpoint, body);
        throw new OfflineError('Network error - operation queued');
      }
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
        status: 0,
      });
    }
  }

  private queueOperation(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): void {
    const operation: PendingOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method,
      endpoint,
      body,
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.pendingOperations.push(operation);
  }

  private async processPendingOperations(): Promise<void> {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const op of operations) {
      try {
        await this.request(op.method, op.endpoint, op.body);
      } catch (error) {
        if (error instanceof OfflineError) {
          // Re-queue if still offline
          this.pendingOperations.push({ ...op, retryCount: op.retryCount + 1 });
        }
        // Other errors are logged but operation is dropped after max retries
        if (op.retryCount < 3) {
          this.pendingOperations.push({ ...op, retryCount: op.retryCount + 1 });
        }
      }
    }
  }

  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }

  // Convenience methods
  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>('GET', endpoint);
    return response.data;
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await this.request<T>('POST', endpoint, body);
    return response.data;
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await this.request<T>('PUT', endpoint, body);
    return response.data;
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await this.request<T>('PATCH', endpoint, body);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>('DELETE', endpoint);
    return response.data;
  }
}

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, string>;
  status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
    this.status = error.status;
  }
}

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}
