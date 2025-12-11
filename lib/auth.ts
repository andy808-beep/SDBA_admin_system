// lib/auth.ts
// Shared authentication and authorization utilities

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { env } from "./env";
import { logger } from "./logger";
import type { AdminUser, AdminCheckResult } from "@/types/auth";

/**
 * Check if a user has admin privileges
 * @param user - Supabase user object
 * @returns true if user is an admin
 */
export function isAdminUser(user: AdminUser | null | undefined): boolean {
  if (!user) return false;
  
  const roles = (user.app_metadata?.roles ?? user.user_metadata?.roles ?? []) as string[];
  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined;
  return roles?.includes("admin") || role === "admin" || user.user_metadata?.is_admin === true;
}

/**
 * Check if the current request is from an authenticated admin user
 * @param req - Next.js request object
 * @returns Object with isAdmin boolean and user object (or null)
 */
export async function checkAdmin(req: NextRequest): Promise<AdminCheckResult> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (err) {
              // Ignore cookie setting errors in API routes
              logger.warn("Cookie set error:", err);
            }
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false, user: null };
    }

    return { isAdmin: isAdminUser(user as AdminUser), user: user as AdminUser };
  } catch (err) {
    logger.error("checkAdmin error:", err);
    return { isAdmin: false, user: null };
  }
}

