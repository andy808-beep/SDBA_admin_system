// app/api/admin/feature-flags/route.ts
// API routes for managing feature flags

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import {
  getAllFeatureFlags,
  getFeatureFlag,
  updateFeatureFlag,
  getFeatureFlagAuditLog,
  FeatureFlagKey,
} from "@/lib/feature-flags";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";

/**
 * @swagger
 * /api/admin/feature-flags:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get all feature flags
 *     description: Get all feature flags with their current status. Requires admin authentication.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of feature flags
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  logger.info("[Feature Flags API] GET request received", { requestId });

  try {
    // Check admin authentication
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      logger.warn("[Feature Flags API] Access denied - not admin", { requestId });
      throw ApiErrors.forbidden();
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const flagKey = searchParams.get("flagKey");
    const includeAudit = searchParams.get("includeAudit") === "true";

    if (flagKey) {
      // Get single flag
      const flag = await getFeatureFlag(flagKey);
      if (!flag) {
        throw ApiErrors.notFound("Feature flag not found");
      }

      const response: any = { flag };
      if (includeAudit) {
        response.audit = await getFeatureFlagAuditLog(flagKey, 50);
      }

      return NextResponse.json({ ok: true, ...response });
    }

    // Get all flags
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ ok: true, flags });
  } catch (error) {
    logger.error("[Feature Flags API] Error in GET", { requestId, error });
    return handleApiError(error);
  }
}

const UpdateFeatureFlagSchema = z.object({
  flagKey: z.string(),
  enabled: z.boolean().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  enabled_for_users: z.array(z.string().uuid()).optional(),
  enabled_for_emails: z.array(z.string().email()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * @swagger
 * /api/admin/feature-flags:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Update a feature flag
 *     description: Update a feature flag's configuration. Requires admin authentication and CSRF token.
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flagKey
 *             properties:
 *               flagKey:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               rollout_percentage:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               enabled_for_users:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               enabled_for_emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       200:
 *         description: Feature flag updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Feature flag not found
 */
export async function PATCH(req: NextRequest) {
  const requestId = getRequestId();
  logger.info("[Feature Flags API] PATCH request received", { requestId });

  try {
    // Note: CSRF protection is handled in middleware.ts

    // Check admin authentication
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      logger.warn("[Feature Flags API] Access denied - not admin", { requestId });
      throw ApiErrors.forbidden();
    }

    // Parse and validate request body
    const body = await req.json();
    const payload = UpdateFeatureFlagSchema.parse(body);

    // Update the feature flag
    const updatedFlag = await updateFeatureFlag(payload.flagKey, payload, user.id);

    if (!updatedFlag) {
      throw ApiErrors.notFound("Feature flag not found");
    }

    logger.info("[Feature Flags API] Feature flag updated", {
      requestId,
      flagKey: payload.flagKey,
      updatedBy: user.id,
    });

    return NextResponse.json({ ok: true, flag: updatedFlag });
  } catch (error) {
    logger.error("[Feature Flags API] Error in PATCH", { requestId, error });
    return handleApiError(error);
  }
}

