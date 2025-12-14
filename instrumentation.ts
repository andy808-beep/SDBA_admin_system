// instrumentation.ts
// Custom instrumentation for Sentry performance tracking
// This file is automatically loaded by Next.js

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    // Use dynamic import to avoid Edge Runtime analysis
    try {
      await import('./lib/instrumentation/server');
    } catch (error) {
      // Silently fail if instrumentation can't be loaded
      console.warn('Failed to load server instrumentation:', error);
    }
  }
  
  // Edge runtime instrumentation is minimal and doesn't need Sentry imports
  // Sentry tracking in middleware is handled directly via Sentry SDK
}

