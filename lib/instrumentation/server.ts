// lib/instrumentation/server.ts
// Server-side Sentry instrumentation for API and database tracking

import * as Sentry from "@sentry/nextjs";

/**
 * Track API route performance
 * Wraps an API route handler to automatically track performance
 */
export function withApiPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const transaction = Sentry.startTransaction({
      name: routeName,
      op: "http.server",
      data: {
        route: routeName,
      },
    });

    try {
      const result = await handler(...args);
      transaction.setStatus("ok");
      return result;
    } catch (error) {
      transaction.setStatus("internal_error");
      throw error;
    } finally {
      transaction.finish();
    }
  }) as T;
}

/**
 * Track database query performance
 * Wraps a database operation to track its performance
 */
export async function trackDatabaseQuery<T>(
  operation: () => Promise<T>,
  operationName: string,
  tableName?: string
): Promise<T> {
  const span = Sentry.startSpan(
    {
      op: "db.query",
      name: operationName,
      data: {
        table: tableName,
        operation: operationName,
      },
    },
    async () => {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            operation: operationName,
            table: tableName || "unknown",
            error_type: "database_error",
          },
        });
        throw error;
      }
    }
  );

  return span as T;
}

/**
 * Track RPC function calls
 */
export async function trackRpcCall<T>(
  rpcFunction: () => Promise<T>,
  functionName: string,
  params?: Record<string, any>
): Promise<T> {
  const span = Sentry.startSpan(
    {
      op: "db.rpc",
      name: functionName,
      data: {
        function: functionName,
        params: params ? JSON.stringify(params) : undefined,
      },
    },
    async () => {
      try {
        const result = await rpcFunction();
        return result;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            function: functionName,
            error_type: "rpc_error",
          },
          extra: {
            params,
          },
        });
        throw error;
      }
    }
  );

  return span as T;
}

/**
 * Track registration approval/rejection events
 */
export function trackRegistrationEvent(
  eventType: "approve" | "reject",
  registrationId: string,
  adminUserId: string,
  success: boolean,
  error?: Error
) {
  try {
    Sentry.addBreadcrumb({
      category: "registration",
      message: `Registration ${eventType}: ${registrationId}`,
      level: success ? "info" : "error",
      data: {
        event_type: eventType,
        registration_id: registrationId,
        admin_user_id: adminUserId,
        success,
      },
    });

    if (!success && error) {
      Sentry.captureException(error, {
        tags: {
          event_type: eventType,
          operation: "registration_management",
        },
        extra: {
          registration_id: registrationId,
          admin_user_id: adminUserId,
        },
      });
    }
  } catch (err) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
  }
}

/**
 * Track authentication failures
 */
export function trackAuthFailure(
  reason: string,
  userId?: string,
  email?: string
) {
  try {
    Sentry.addBreadcrumb({
      category: "auth",
      message: `Authentication failure: ${reason}`,
      level: "warning",
      data: {
        reason,
        user_id: userId,
        email,
      },
    });

    // Don't send to Sentry as an error (expected behavior)
    // Just log as breadcrumb for context
  } catch (error) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
  }
}

