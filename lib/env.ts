// lib/env.ts
// Environment variable validation and access

const isServer = typeof window === "undefined";

/**
 * Validates that all required environment variables are present
 * Only validates on the server (fail-fast)
 * On client, variables should be embedded at build time
 */
function validateEnv() {
  // Server-side variables (only available on server)
  const serverRequired = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'CSRF_SECRET',
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
  // On client, we don't validate here - variables should be embedded at build time
  // If they're missing, we'll get undefined values which will cause errors at usage time
}

// Validate on module load (server-side only)
validateEnv();

/**
 * Validated environment variables
 * Note: On client, NEXT_PUBLIC_* variables are embedded at build time
 * If they're missing, they'll be undefined (which will cause errors at usage)
 */
export const env = {
  // Client-side variables (embedded at build time)
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  // Server-side variable - only available on server
  SUPABASE_SERVICE_ROLE_KEY: (isServer ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '') as string,
} as const;

