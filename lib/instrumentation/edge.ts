// lib/instrumentation/edge.ts
// Edge runtime Sentry instrumentation

import * as Sentry from "@sentry/nextjs";

/**
 * Track middleware performance
 */
export function trackMiddlewarePerformance(
  pathname: string,
  operation: () => Promise<Response> | Response
): Promise<Response> | Response {
  const transaction = Sentry.startTransaction({
    name: `middleware:${pathname}`,
    op: "middleware",
    data: {
      pathname,
    },
  });

  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result
        .then((response) => {
          transaction.setStatus("ok");
          return response;
        })
        .catch((error) => {
          transaction.setStatus("internal_error");
          throw error;
        })
        .finally(() => {
          transaction.finish();
        });
    }
    
    transaction.setStatus("ok");
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus("internal_error");
    transaction.finish();
    throw error;
  }
}

