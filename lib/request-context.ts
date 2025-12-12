// lib/request-context.ts
// Request context for correlation IDs and request tracking

// Note: AsyncLocalStorage is only available in Node.js, not Edge runtime
// For Edge runtime (middleware), we use a simpler approach with request headers
let asyncLocalStorage: any = null;

try {
  // Try to import AsyncLocalStorage (Node.js only)
  if (typeof require !== "undefined") {
    const { AsyncLocalStorage } = require("async_hooks");
    asyncLocalStorage = new AsyncLocalStorage();
  }
} catch {
  // AsyncLocalStorage not available (Edge runtime)
  asyncLocalStorage = null;
}

/**
 * Request context data
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
  method?: string;
  path?: string;
}

/**
 * AsyncLocalStorage for request context
 * This allows us to access request context anywhere in the request lifecycle
 */
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 * @returns Request context or null if not in a request
 */
export function getRequestContext(): RequestContext | null {
  if (!asyncLocalStorage) {
    return null; // Edge runtime - context not available
  }
  return asyncLocalStorage.getStore() || null;
}

/**
 * Get the current request ID
 * @returns Request ID or null
 */
export function getRequestId(): string | null {
  const context = getRequestContext();
  return context?.requestId || null;
}

/**
 * Run a function with request context
 * @param context - Request context
 * @param fn - Function to run
 * @returns Result of the function
 */
export function withRequestContext<T>(context: RequestContext, fn: () => T): T {
  if (!asyncLocalStorage) {
    // Edge runtime - just run the function without context
    return fn();
  }
  return asyncLocalStorage.run(context, fn);
}

/**
 * Generate a unique request ID
 * @returns Request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `REQ-${timestamp}-${random}`;
}

/**
 * Create a new request context
 * @param options - Context options
 * @returns Request context
 */
export function createRequestContext(options: {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
}): RequestContext {
  return {
    requestId: options.requestId || generateRequestId(),
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    startTime: Date.now(),
    method: options.method,
    path: options.path,
  };
}

