// types/auth.ts
// Type definitions for authentication and authorization

import type { User } from '@supabase/supabase-js';

/**
 * Extended User type with admin metadata
 * Uses intersection type to properly extend User's metadata types
 */
export type AdminUser = User & {
  app_metadata?: (User['app_metadata'] & {
    roles?: string[];
    role?: string;
  }) | null;
  user_metadata?: (User['user_metadata'] & {
    roles?: string[];
    role?: string;
    is_admin?: boolean;
  }) | null;
};

/**
 * Admin check result
 */
export interface AdminCheckResult {
  isAdmin: boolean;
  user: AdminUser | null;
}

