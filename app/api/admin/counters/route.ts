// app/api/admin/counters/route.ts
// Optimized counter queries with proper indexing

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { executeQuery } from "@/lib/db-utils";

/**
 * @swagger
 * /api/admin/counters:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get registration counters
 *     description: Get counts of registrations by status and new registrations today. Requires admin authentication.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Registration counters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                   description: Total number of registrations
 *                 pending:
 *                   type: integer
 *                   description: Number of pending registrations
 *                 approved:
 *                   type: integer
 *                   description: Number of approved registrations
 *                 rejected:
 *                   type: integer
 *                   description: Number of rejected registrations
 *                 new_today:
 *                   type: integer
 *                   description: Number of new registrations today
 *             example:
 *               ok: true
 *               total: 150
 *               pending: 25
 *               approved: 100
 *               rejected: 25
 *               new_today: 5
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
 *       500:
 *         description: Internal server error
 * 
 * Performance Characteristics:
 * - Uses index idx_registration_meta_status for status counts
 * - Uses index idx_registration_meta_created_at for date range queries
 * - All queries use count: "exact" with head: true for efficiency
 * - Expected execution time: 10-20ms total (5 queries)
 */
export async function GET(req: NextRequest) {
  logger.debug("[Counters API] GET request received");
  try {
    // Check admin authentication
    logger.debug("[Counters API] Checking admin authentication...");
    const { isAdmin } = await checkAdmin(req);
    logger.debug("[Counters API] Admin check result:", { isAdmin });

    if (!isAdmin) {
      logger.debug("[Counters API] Access denied - not admin");
      throw ApiErrors.forbidden();
    }

    // Get local midnight for today (in UTC)
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    logger.debug("[Counters API] Today start (UTC):", todayStart.toISOString());

    // Execute all count queries in parallel for better performance
    // Uses indexes: idx_registration_meta_status for status counts
    const [totalResult, pendingResult, approvedResult, rejectedResult, newTodayResult] =
      await Promise.all([
        // Total count - uses primary key index
        executeQuery(
          () =>
            supabaseServer
              .from("registration_meta")
              .select("*", { count: "exact", head: true }),
          "count_total",
          "registration_meta"
        ),

        // Pending count - uses idx_registration_meta_status
        executeQuery(
          () =>
            supabaseServer
              .from("registration_meta")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
          "count_pending",
          "registration_meta"
        ),

        // Approved count - uses idx_registration_meta_status
        executeQuery(
          () =>
            supabaseServer
              .from("registration_meta")
              .select("*", { count: "exact", head: true })
              .eq("status", "approved"),
          "count_approved",
          "registration_meta"
        ),

        // Rejected count - uses idx_registration_meta_status
        executeQuery(
          () =>
            supabaseServer
              .from("registration_meta")
              .select("*", { count: "exact", head: true })
              .eq("status", "rejected"),
          "count_rejected",
          "registration_meta"
        ),

        // New today count - uses idx_registration_meta_created_at
        executeQuery(
          () =>
            supabaseServer
              .from("registration_meta")
              .select("*", { count: "exact", head: true })
              .gte("created_at", todayStart.toISOString()),
          "count_new_today",
          "registration_meta"
        ),
      ]);

    // Check for errors
    if (totalResult.error) {
      logger.error("[Counters API] totalError:", totalResult.error);
      throw ApiErrors.badRequest(totalResult.error.message);
    }
    if (pendingResult.error) {
      logger.error("[Counters API] pendingError:", pendingResult.error);
      throw ApiErrors.badRequest(pendingResult.error.message);
    }
    if (approvedResult.error) {
      logger.error("[Counters API] approvedError:", approvedResult.error);
      throw ApiErrors.badRequest(approvedResult.error.message);
    }
    if (rejectedResult.error) {
      logger.error("[Counters API] rejectedError:", rejectedResult.error);
      throw ApiErrors.badRequest(rejectedResult.error.message);
    }
    if (newTodayResult.error) {
      logger.error("[Counters API] newTodayError:", newTodayResult.error);
      throw ApiErrors.badRequest(newTodayResult.error.message);
    }

    return NextResponse.json({
      ok: true,
      total: totalResult.count || 0,
      pending: pendingResult.count || 0,
      approved: approvedResult.count || 0,
      rejected: rejectedResult.count || 0,
      new_today: newTodayResult.count || 0,
    });
  } catch (error) {
    logger.error("[Counters API] Unexpected error:", error);
    if (error instanceof Error) {
      logger.error("[Counters API] Error stack:", error.stack);
    }
    return handleApiError(error);
  }
}

