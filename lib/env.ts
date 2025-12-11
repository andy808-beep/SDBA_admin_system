// lib/env.ts
// Environment variable validation and access

/**
 * Validates server-side environment variables
 * Only validates SUPABASE_SERVICE_ROLE_KEY (server-only)
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is missing
 */
export function validateServerEnv() {
  // Skip validation during build
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Only validate server-side env vars
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY\n' +
      'Please check your .env.local file or environment configuration.'
    );
  }
}

/**
 * Check if we're in a build context
 */
const isBuildTime = typeof window === 'undefined' && 
  (process.env.NEXT_PHASE === 'phase-production-build' || !process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Server-side environment variables (includes service role key)
 * Only use this in server-side code (API routes, server components, etc.)
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    if (isBuildTime) {
      return 'https://placeholder.supabase.co';
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    if (isBuildTime) {
      return 'placeholder-anon-key';
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    if (isBuildTime) {
      return 'placeholder-service-role-key';
    }
    // Only validate on server-side
    if (typeof window === 'undefined') {
      validateServerEnv();
    }
    return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  },
} as const;

