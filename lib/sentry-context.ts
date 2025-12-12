// lib/sentry-context.ts
// Helper functions to set user context in Sentry

import * as Sentry from "@sentry/nextjs";
import { AdminUser } from "@/types/auth";

/**
 * Set user context in Sentry for error tracking
 * @param user AdminUser object or null
 */
export function setSentryUser(user: AdminUser | null) {
  try {
    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.email,
      // Add admin role to tags
    });

    Sentry.setTag("user_role", "admin");
    Sentry.setTag("user_id", user.id);
  } catch (error) {
    // Silently fail if Sentry is not initialized
    // This can happen in test environments or if Sentry is not configured
  }
}

/**
 * Clear user context in Sentry
 */
export function clearSentryUser() {
  try {
    Sentry.setUser(null);
    Sentry.setTag("user_role", undefined);
    Sentry.setTag("user_id", undefined);
  } catch (error) {
    // Silently fail if Sentry is not initialized
  }
}

/**
 * Add custom context to Sentry events
 */
export function addSentryContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context);
}

