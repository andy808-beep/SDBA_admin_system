// lib/env.ts
// Environment variable validation and access

const isServer = typeof window === "undefined";

// Track if validation has been performed (lazy validation)
let envValidated = false;

/**
 * Validates that all required environment variables are present
 * Only validates on the server (fail-fast)
 * On client, variables should be embedded at build time
 * Uses lazy validation - only validates when first accessed
 */
function validateEnv() {
  // Skip if already validated
  if (envValidated) {
    return;
  }

  // Server-side variables (only available on server)
  const serverRequired = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'CSRF_SECRET',
    'RESEND_API_KEY',
  ] as const;

  // Only validate server-side variables on the server
  if (isServer) {
    const missing: string[] = [];
    
    // Validate server-side variables
    for (const key of serverRequired) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }

    // Also validate client-side variables on server (they should be available)
    const clientRequired = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ] as const;
    
    for (const key of clientRequired) {
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
  
  // Mark as validated
  envValidated = true;
  // On client, we don't validate here - variables should be embedded at build time
  // If they're missing, we'll get undefined values which will cause errors at usage time
}

/**
 * Validated environment variables
 * Note: On client, NEXT_PUBLIC_* variables are embedded at build time
 * If they're missing, they'll be undefined (which will cause errors at usage)
 * Validation happens lazily on first access to ensure .env.local is loaded
 */
export const env = {
  // Client-side variables (embedded at build time)
  get NEXT_PUBLIC_SUPABASE_URL() {
    validateEnv();
    return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    validateEnv();
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  },
  // Server-side variable - only available on server
  get SUPABASE_SERVICE_ROLE_KEY() {
    validateEnv();
    return (isServer ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '') as string;
  },
} as const;

/**
 * Get the Resend API key from environment variables
 * @throws Error if RESEND_API_KEY is not set
 * Validates environment variables on first call (lazy validation)
 */
export function getResendApiKey(): string {
  validateEnv(); // Ensure env is validated before accessing
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }
  return key;
}

