// app/api/admin/list/route.ts
// Optimized list query with proper indexing and pagination

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import {
  executeQuery,
  validatePagination,
  applyPagination,
  applySearchFilter,
} from "@/lib/db-utils";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/admin/list:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List registrations
 *     description: Get a paginated list of registrations with filtering and search. Requires admin authentication.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (1-indexed)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         description: Number of items per page (max 100)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: q
 *         in: query
 *         description: Search term (searches team_name, org_name, email_1, team_code)
 *         required: false
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, pending, approved, rejected]
 *           default: all
 *       - name: event
 *         in: query
 *         description: Filter by event type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [all, tn, wu, sc]
 *           default: all
 *       - name: season
 *         in: query
 *         description: Filter by season (year)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 2000
 *           maximum: 2100
 *     responses:
 *       200:
 *         description: List of registrations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
 *       500:
 *         description: Internal server error
 * 
 * Performance Characteristics:
 * - Uses composite index idx_registration_meta_status_created_at for status + sort
 * - Uses idx_registration_meta_status_event_season for multi-filter queries
 * - Uses GIN indexes for text search (team_name_normalized, org_name)
 * - Expected execution time: 2-10ms with indexes
 */
export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdmin(req);
    if (!isAdmin) {
      throw ApiErrors.forbidden();
    }

    // Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams;
    const { page, pageSize } = validatePagination(
      searchParams.get("page"),
      searchParams.get("pageSize")
    );
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const event = searchParams.get("event") || "all";
    const seasonParam = searchParams.get("season");

    // Build base query with count
    // Note: Using count: "exact" for accurate pagination totals
    let query = supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact" });

    // Apply search filter (searches multiple columns)
    // Uses GIN indexes on team_name_normalized and org_name for fast text search
    if (q) {
      query = applySearchFilter(query, q, [
        "team_name",
        "org_name",
        "email_1",
        "team_code",
      ]);
    }

    // Apply status filter
    // Uses index: idx_registration_meta_status or idx_registration_meta_status_created_at
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply event type filter
    // Uses index: idx_registration_meta_event_type
    if (event !== "all") {
      query = query.eq("event_type", event);
    }

    // Apply season filter
    // Uses index: idx_registration_meta_season
    if (seasonParam) {
      const season = parseInt(seasonParam, 10);
      if (!isNaN(season) && season >= 2000 && season <= 2100) {
        query = query.eq("season", season);
      }
    }

    // Apply sorting
    // Uses index: idx_registration_meta_created_at or composite indexes
    // DESC order is optimized with DESC index
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    // Uses LIMIT/OFFSET which is efficient with proper indexes
    query = applyPagination(query, page, pageSize);

    // Execute query with performance monitoring
    const { data, error, count: totalCount } = await executeQuery(
      () => query,
      "list_registrations",
      "registration_meta"
    );

    if (error) {
      logger.error("List query error:", error);
      throw ApiErrors.badRequest(error.message);
    }

    // Transform response items
    // Only return necessary fields to reduce payload size
    const items = (data || []).map((item) => ({
      id: item.id,
      season: item.season,
      event_type: item.event_type,
      division_code: item.division_code,
      category: item.category,
      option_choice: item.option_choice,
      team_code: item.team_code,
      team_name: item.team_name,
      org_name: item.org_name,
      org_address: item.org_address,
      manager_name: item.team_manager_1,
      manager_email: item.email_1,
      manager_mobile: item.mobile_1,
      status: item.status,
      approved_by: item.approved_by,
      approved_at: item.approved_at,
      created_at: item.created_at,
    }));

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total: totalCount || 0,
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

