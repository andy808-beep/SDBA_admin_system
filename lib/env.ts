// lib/env.ts
// Environment variable validation and access

/**
 * Validates that all required environment variables are present
 * Call this function at runtime (e.g., in API routes) to validate env vars
 * @throws Error if any required env vars are missing
 */
export function validateEnv() {
  // Skip validation during build (Next.js build phase)
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file or environment configuration.'
    );
  }
}

/**
 * Environment variables
 * Note: During build, these may be undefined. Validation happens at runtime.
 * Vercel will set these environment variables during deployment.
 */
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!value && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
      validateEnv();
    }
    return value || '';
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!value && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
      validateEnv();
    }
    return value || '';
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!value && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
      validateEnv();
    }
    return value || '';
  },
} as const;

