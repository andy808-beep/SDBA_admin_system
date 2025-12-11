// types/auth.ts
// Type definitions for authentication and authorization

import type { User } from '@supabase/supabase-js';

/**
 * Extended User type with admin metadata
 */
export interface AdminUser extends User {
  app_metadata?: {
    roles?: string[];
    role?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    roles?: string[];
    role?: string;
    is_admin?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Admin check result
 */
export interface AdminCheckResult {
  isAdmin: boolean;
  user: AdminUser | null;
}

