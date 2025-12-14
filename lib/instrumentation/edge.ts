// lib/instrumentation/edge.ts
// Edge runtime Sentry instrumentation
// NOTE: This file is loaded by instrumentation.ts but may not be used
// Keeping it minimal to avoid Edge Runtime compatibility issues

/**
 * Track middleware performance
 * Simplified version for Edge Runtime - just passes through
 * Full Sentry tracking happens via middleware's direct Sentry calls
 */
export function trackMiddlewarePerformance(
  pathname: string,
  operation: () => Promise<Response> | Response
): Promise<Response> | Response {
  // Just pass through - Sentry tracking is handled directly in middleware
  // This avoids Edge Runtime compatibility issues with Sentry imports
  return operation();
}

