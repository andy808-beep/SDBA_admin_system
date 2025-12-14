// lib/instrumentation/server.ts
// Server-side Sentry instrumentation for API and database tracking
// NOTE: This file should only be imported in Node.js runtime (API routes, not middleware)

// Conditional import to avoid Edge Runtime issues
let Sentry: typeof import("@sentry/nextjs") | null = null;

async function getSentry() {
  if (!Sentry && typeof window === "undefined") {
    try {
      Sentry = await import("@sentry/nextjs");
    } catch (error) {
      // Sentry not available (e.g., in test environment)
      return null;
    }
  }
  return Sentry;
}

/**
 * Track API route performance
 * Wraps an API route handler to automatically track performance
 */
export function withApiPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>) => {
    const sentry = await getSentry();
    if (!sentry) {
      // Sentry not available, just run handler
      return handler(...args);
    }
    
    // Use startSpan instead of deprecated startTransaction
    return sentry.startSpan(
      {
        name: routeName,
        op: "http.server",
        attributes: {
          route: routeName,
        },
      },
      async (span) => {
        try {
          const result = await handler(...args);
          span?.setStatus({ code: 1, message: "ok" }); // 1 = OK
          return result;
        } catch (error) {
          span?.setStatus({ code: 2, message: "internal_error" }); // 2 = ERROR
          throw error;
        }
      }
    );
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
  const sentry = await getSentry();
  if (!sentry) {
    // Sentry not available, just run operation
    return operation();
  }
  
  const span = sentry.startSpan(
    {
      op: "db.query",
      name: operationName,
      attributes: {
        table: tableName,
        operation: operationName,
      },
    },
    async () => {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        sentry.captureException(error, {
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
export async function trackRpcCall<T extends { data: any; error: any }>(
  rpcFunction: () => Promise<T>,
  functionName: string,
  params?: Record<string, any>
): Promise<T> {
  const sentry = await getSentry();
  if (!sentry) {
    // Sentry not available, just run function
    return rpcFunction();
  }
  
  return sentry.startSpan(
    {
      op: "db.rpc",
      name: functionName,
      attributes: {
        function: functionName,
        params: params ? JSON.stringify(params) : undefined,
      },
    },
    async () => {
      try {
        const result = await rpcFunction();
        return result;
      } catch (error) {
        sentry.captureException(error, {
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
  ) as Promise<T>;
}

/**
 * Track registration approval/rejection events
 */
export async function trackRegistrationEvent(
  eventType: "approve" | "reject",
  registrationId: string,
  adminUserId: string,
  success: boolean,
  error?: Error
) {
  try {
    const sentry = await getSentry();
    if (!sentry) {
      return; // Sentry not available
    }
    
    sentry.addBreadcrumb({
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
      sentry.captureException(error, {
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
export async function trackAuthFailure(
  reason: string,
  userId?: string,
  email?: string
) {
  try {
    const sentry = await getSentry();
    if (!sentry) {
      return; // Sentry not available
    }
    
    sentry.addBreadcrumb({
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

