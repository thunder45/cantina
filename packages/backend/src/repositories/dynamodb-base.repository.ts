/**
 * DynamoDB Base Repository
 * Provides common functionality for DynamoDB operations including:
 * - Retry logic for transient failures
 * - Optimistic locking with version field
 * - Proper error handling
 * 
 * Requirements: 11.1
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

/**
 * Entity with version field for optimistic locking
 */
export interface VersionedEntity {
  version: number;
}

/**
 * Error codes for DynamoDB operations
 */
export const DynamoDBErrorCodes = {
  CONDITIONAL_CHECK_FAILED: 'ERR_CONDITIONAL_CHECK_FAILED',
  ITEM_NOT_FOUND: 'ERR_ITEM_NOT_FOUND',
  TRANSIENT_ERROR: 'ERR_TRANSIENT_ERROR',
  VALIDATION_ERROR: 'ERR_VALIDATION_ERROR',
  VERSION_CONFLICT: 'ERR_VERSION_CONFLICT',
} as const;

/**
 * Transient error types that should trigger retry
 */
const TRANSIENT_ERROR_CODES = [
  'ProvisionedThroughputExceededException',
  'ThrottlingException',
  'ServiceUnavailable',
  'InternalServerError',
  'RequestLimitExceeded',
];

/**
 * Check if an error is transient and should be retried
 * @param error - Error to check
 * @returns true if error is transient
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorName = error.name || '';
    const errorMessage = error.message || '';
    
    return TRANSIENT_ERROR_CODES.some(code => 
      errorName.includes(code) || errorMessage.includes(code)
    );
  }
  return false;
}


/**
 * Calculate delay for exponential backoff with jitter
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  
  // Add jitter (random factor between 0.5 and 1.5)
  const jitter = 0.5 + Math.random();
  const delayWithJitter = exponentialDelay * jitter;
  
  // Cap at max delay
  return Math.min(delayWithJitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic for transient failures
 * @param operation - Async operation to execute
 * @param config - Retry configuration
 * @returns Result of the operation
 * @throws Error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw lastError;
      }
      
      // Don't retry if we've exhausted all attempts
      if (attempt >= config.maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, config);
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(DynamoDBErrorCodes.TRANSIENT_ERROR);
}

/**
 * Validate version for optimistic locking
 * @param currentVersion - Current version in storage
 * @param expectedVersion - Expected version from client
 * @throws Error if versions don't match
 */
export function validateVersion(currentVersion: number, expectedVersion: number): void {
  if (currentVersion !== expectedVersion) {
    throw new Error(DynamoDBErrorCodes.VERSION_CONFLICT);
  }
}

/**
 * Increment version for optimistic locking
 * @param entity - Entity with version field
 * @returns New version number
 */
export function incrementVersion<T extends VersionedEntity>(entity: T): number {
  return entity.version + 1;
}

/**
 * Initialize version for new entities
 * @returns Initial version number (1)
 */
export function initializeVersion(): number {
  return 1;
}

/**
 * Create a versioned entity from base entity
 * @param entity - Base entity without version
 * @returns Entity with version field initialized
 */
export function createVersionedEntity<T>(entity: T): T & VersionedEntity {
  return {
    ...entity,
    version: initializeVersion(),
  };
}

/**
 * Update a versioned entity with new version
 * @param entity - Entity with version field
 * @param updates - Updates to apply
 * @returns Updated entity with incremented version
 */
export function updateVersionedEntity<T extends VersionedEntity>(
  entity: T,
  updates: Partial<Omit<T, 'version'>>
): T {
  return {
    ...entity,
    ...updates,
    version: incrementVersion(entity),
  };
}

/**
 * Base class for DynamoDB repositories with common functionality
 * This provides a template for implementing DynamoDB operations
 */
export abstract class DynamoDBBaseRepository<T extends VersionedEntity> {
  protected retryConfig: RetryConfig;
  
  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }
  
  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<R>(operation: () => Promise<R>): Promise<R> {
    return withRetry(operation, this.retryConfig);
  }
  
  /**
   * Create a new entity with version initialized
   */
  protected initializeEntity<E>(entity: E): E & VersionedEntity {
    return createVersionedEntity(entity);
  }
  
  /**
   * Update entity with version check and increment
   */
  protected updateEntity(entity: T, updates: Partial<Omit<T, 'version'>>): T {
    return updateVersionedEntity(entity, updates);
  }
}
