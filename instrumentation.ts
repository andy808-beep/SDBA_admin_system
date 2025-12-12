// instrumentation.ts
// Custom instrumentation for Sentry performance tracking
// This file is automatically loaded by Next.js

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    await import('./lib/instrumentation/server');
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    await import('./lib/instrumentation/edge');
  }
}

