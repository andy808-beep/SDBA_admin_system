// sentry.client.config.ts
// Sentry configuration for client-side (browser)

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Set sample rate for error events (100% in production)
  sampleRate: 1.0,
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
  
  // Set environment
  environment: process.env.NODE_ENV || "development",
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // Filter out expected errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "atomicFindClose",
    "fb_xd_fragment",
    "bmi_SafeAddOnload",
    "EBCallBackMessageReceived",
    "conduitPage",
    // Network errors that are expected
    "NetworkError",
    "Network request failed",
    // 401/403 authentication errors (expected)
    "Unauthorized",
    "Forbidden",
  ],
  
  // Filter out specific error messages
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
  
  // Custom fingerprinting for similar errors
  beforeSend(event, hint) {
    // Don't send events if DSN is not configured
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
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
  
  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Session Replay
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

