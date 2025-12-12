// lib/feature-flags.ts
// Feature flags system for runtime feature toggling

import { supabaseServer } from "./supabaseServer";
import { logger } from "./logger";
import { getRequestId } from "./request-context";

/**
 * Feature flag keys (must match database flag_key values)
 */
export const FEATURE_FLAGS = {
  ENABLE_RATE_LIMITING: "ENABLE_RATE_LIMITING",
  ENABLE_EMAIL_NOTIFICATIONS: "ENABLE_EMAIL_NOTIFICATIONS",
  ENABLE_ADVANCED_FILTERING: "ENABLE_ADVANCED_FILTERING",
  ENABLE_BULK_OPERATIONS: "ENABLE_BULK_OPERATIONS",
  NEW_DASHBOARD_DESIGN: "NEW_DASHBOARD_DESIGN",
} as const;

export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  enabled_for_users: string[];
  enabled_for_emails: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagResult {
  enabled: boolean;
  reason: "globally_enabled" | "globally_disabled" | "user_allowlist" | "rollout_percentage" | "not_found";
  rollout_percentage?: number;
}

/**
 * Check if a feature flag is enabled for a user
 * Uses database function for consistent evaluation
 * 
 * @param flagKey - The feature flag key
 * @param userId - Optional user ID for user-specific flags
 * @param userEmail - Optional user email for email-based flags
 * @returns true if feature is enabled, false otherwise
 */
export async function isFeatureEnabled(
  flagKey: FeatureFlagKey | string,
  userId?: string | null,
  userEmail?: string | null
): Promise<boolean> {
  const requestId = getRequestId();
  
  try {
    const { data, error } = await supabaseServer.rpc("is_feature_enabled", {
      p_flag_key: flagKey,
      p_user_id: userId || null,
      p_user_email: userEmail || null,
    });

    if (error) {
      logger.error(`[Feature Flags] Error checking flag ${flagKey}`, {
        requestId,
        error: error.message,
        userId,
        userEmail,
      });
      // Fail closed: if we can't check, assume disabled
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error(`[Feature Flags] Exception checking flag ${flagKey}`, {
      requestId,
      error,
      userId,
      userEmail,
    });
    // Fail closed: if we can't check, assume disabled
    return false;
  }
}

/**
 * Get detailed feature flag evaluation result
 * 
 * @param flagKey - The feature flag key
 * @param userId - Optional user ID
 * @param userEmail - Optional user email
 * @returns Feature flag evaluation result
 */
export async function getFeatureFlagResult(
  flagKey: FeatureFlagKey | string,
  userId?: string | null,
  userEmail?: string | null
): Promise<FeatureFlagResult> {
  const requestId = getRequestId();
  
  try {
    // Get the flag configuration
    const { data: flag, error: fetchError } = await supabaseServer
      .from("feature_flags")
      .select("*")
      .eq("flag_key", flagKey)
      .single();

    if (fetchError || !flag) {
      return {
        enabled: false,
        reason: "not_found",
      };
    }

    // Check if globally disabled
    if (!flag.enabled) {
      return {
        enabled: false,
        reason: "globally_disabled",
      };
    }

    // Check user allowlist
    if (userId && flag.enabled_for_users?.includes(userId)) {
      return {
        enabled: true,
        reason: "user_allowlist",
      };
    }

    if (userEmail && flag.enabled_for_emails?.includes(userEmail)) {
      return {
        enabled: true,
        reason: "user_allowlist",
      };
    }

    // Check rollout percentage
    if (flag.rollout_percentage < 100) {
      const enabled = await isFeatureEnabled(flagKey, userId, userEmail);
      return {
        enabled,
        reason: "rollout_percentage",
        rollout_percentage: flag.rollout_percentage,
      };
    }

    return {
      enabled: true,
      reason: "globally_enabled",
    };
  } catch (error) {
    logger.error(`[Feature Flags] Exception getting flag result for ${flagKey}`, {
      requestId,
      error,
      userId,
      userEmail,
    });
    return {
      enabled: false,
      reason: "not_found",
    };
  }
}

/**
 * Get all feature flags
 * 
 * @returns Array of all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const requestId = getRequestId();
  
  try {
    const { data, error } = await supabaseServer
      .from("feature_flags")
      .select("*")
      .order("flag_key", { ascending: true });

    if (error) {
      logger.error("[Feature Flags] Error fetching all flags", {
        requestId,
        error: error.message,
      });
      return [];
    }

    return (data || []) as FeatureFlag[];
  } catch (error) {
    logger.error("[Feature Flags] Exception fetching all flags", {
      requestId,
      error,
    });
    return [];
  }
}

/**
 * Get a single feature flag by key
 * 
 * @param flagKey - The feature flag key
 * @returns Feature flag or null if not found
 */
export async function getFeatureFlag(flagKey: FeatureFlagKey | string): Promise<FeatureFlag | null> {
  const requestId = getRequestId();
  
  try {
    const { data, error } = await supabaseServer
      .from("feature_flags")
      .select("*")
      .eq("flag_key", flagKey)
      .single();

    if (error || !data) {
      logger.debug(`[Feature Flags] Flag not found: ${flagKey}`, {
        requestId,
        error: error?.message,
      });
      return null;
    }

    return data as FeatureFlag;
  } catch (error) {
    logger.error(`[Feature Flags] Exception fetching flag ${flagKey}`, {
      requestId,
      error,
    });
    return null;
  }
}

/**
 * Update a feature flag
 * 
 * @param flagKey - The feature flag key
 * @param updates - Partial feature flag updates
 * @param updatedBy - User ID who made the change
 * @returns Updated feature flag or null if not found
 */
export async function updateFeatureFlag(
  flagKey: FeatureFlagKey | string,
  updates: Partial<Pick<FeatureFlag, "enabled" | "rollout_percentage" | "enabled_for_users" | "enabled_for_emails" | "metadata">>,
  updatedBy: string
): Promise<FeatureFlag | null> {
  const requestId = getRequestId();
  
  try {
    // Get current flag for audit log
    const currentFlag = await getFeatureFlag(flagKey);
    if (!currentFlag) {
      logger.warn(`[Feature Flags] Cannot update non-existent flag: ${flagKey}`, { requestId });
      return null;
    }

    // Update the flag
    const { data, error } = await supabaseServer
      .from("feature_flags")
      .update({
        ...updates,
        updated_by: updatedBy,
      })
      .eq("flag_key", flagKey)
      .select()
      .single();

    if (error || !data) {
      logger.error(`[Feature Flags] Error updating flag ${flagKey}`, {
        requestId,
        error: error?.message,
      });
      return null;
    }

    // Log the change
    const action = updates.enabled !== undefined
      ? (updates.enabled ? "enabled" : "disabled")
      : updates.rollout_percentage !== undefined
      ? "rollout_changed"
      : "updated";

    await supabaseServer.rpc("log_feature_flag_change", {
      p_flag_id: currentFlag.id,
      p_flag_key: flagKey,
      p_action: action,
      p_old_value: currentFlag as any,
      p_new_value: data as any,
      p_changed_by: updatedBy,
      p_notes: null,
    });

    logger.info(`[Feature Flags] Flag ${flagKey} updated`, {
      requestId,
      flagKey,
      action,
      updatedBy,
    });

    return data as FeatureFlag;
  } catch (error) {
    logger.error(`[Feature Flags] Exception updating flag ${flagKey}`, {
      requestId,
      error,
    });
    return null;
  }
}

/**
 * Get feature flag audit log
 * 
 * @param flagKey - Optional flag key to filter by
 * @param limit - Maximum number of records to return
 * @returns Array of audit log entries
 */
export async function getFeatureFlagAuditLog(
  flagKey?: FeatureFlagKey | string,
  limit: number = 100
): Promise<any[]> {
  const requestId = getRequestId();
  
  try {
    let query = supabaseServer
      .from("feature_flag_audit")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(limit);

    if (flagKey) {
      query = query.eq("flag_key", flagKey);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("[Feature Flags] Error fetching audit log", {
        requestId,
        error: error.message,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("[Feature Flags] Exception fetching audit log", {
      requestId,
      error,
    });
    return [];
  }
}

/**
 * Client-side hook for checking feature flags
 * This is a simplified version that can be used in React components
 * For server-side checks, use isFeatureEnabled() directly
 */
export function useFeatureFlag(flagKey: FeatureFlagKey | string): boolean {
  // This would typically use React hooks, but for server-side usage,
  // we'll return a function that can be called with user context
  // In a real implementation, you might want to use React Query or SWR
  // to cache and fetch feature flags on the client side
  return false; // Placeholder - implement with React hooks if needed
}

