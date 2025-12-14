// sentry.edge.config.ts
// Sentry configuration for Edge runtime (middleware, Edge Functions)

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Set sample rate for error events (100% in production)
  sampleRate: 1.0,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
  
  // Set environment
  environment: process.env.NODE_ENV || "development",
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Filter out expected errors
  ignoreErrors: [
    // 401/403 authentication errors (expected)
    "Unauthorized",
    "Forbidden",
  ],
  
  // Custom fingerprinting for similar errors
  beforeSend(event, hint) {
    // Don't send events if DSN is not configured
    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    
    // Filter out 401/403 errors (expected authentication failures)
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === "object" && "statusCode" in error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 401 || statusCode === 403) {
          return null;
        }
      }
    }
    
    return event;
  },
  
  // Performance monitoring (tracesSampleRate is set at line 10)
  
  // Custom tags for better error grouping
  initialScope: {
    tags: {
      component: "edge",
    },
  },
});

