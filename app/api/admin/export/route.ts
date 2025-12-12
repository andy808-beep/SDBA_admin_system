import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { executeQuery } from "@/lib/db-utils";

// Request payload validation schema
const ExportPayload = z.object({
  mode: z.enum(["tn", "wu", "sc", "all"]),
  season: z.number().int().min(2000).max(2100).optional(),
  category: z.enum(["men_open", "ladies_open", "mixed_open", "mixed_corporate"]).optional(),
});

// Helper to escape CSV field (RFC4180)
function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to convert row to CSV line
function rowToCsv(row: Record<string, unknown>, headers: string[]): string {
  return headers.map((header) => escapeCsvField(row[header])).join(",");
}

/**
 * @swagger
 * /api/admin/export:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Export team data as CSV
 *     description: Export team data for a specific mode and optional filters. Requires admin authentication and CSRF token.
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
 *               - mode
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [tn, wu, sc, all]
 *                 description: Export mode
 *               season:
 *                 type: integer
 *                 minimum: 2000
 *                 maximum: 2100
 *                 description: Filter by season (optional)
 *               category:
 *                 type: string
 *                 enum: [men_open, ladies_open, mixed_open, mixed_corporate]
 *                 description: Filter by category (optional, only for TN mode)
 *           examples:
 *             tn_all:
 *               summary: Export all TN teams
 *               value:
 *                 mode: "tn"
 *             tn_season:
 *               summary: Export TN teams for specific season
 *               value:
 *                 mode: "tn"
 *                 season: 2025
 *             tn_category:
 *               summary: Export TN teams for specific category
 *               value:
 *                 mode: "tn"
 *                 category: "men_open"
 *                 season: 2025
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: 'attachment; filename="SDBA_tn_men_open_2025-01-01T12-00.csv"'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
 *       404:
 *         description: No data found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // Note: CSRF protection is handled in middleware.ts
    // This route only processes requests that have passed CSRF validation
    
    // Check admin authentication
    const { isAdmin } = await checkAdmin(req);
    if (!isAdmin) {
      throw ApiErrors.forbidden();
    }

    // Parse and validate request body
    const body = await req.json();
    const { mode, season, category } = ExportPayload.parse(body);

    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let filenameMode: string = mode;

    // Fetch data based on mode using service role client
    if (mode === "tn") {
      // TN: Use views
      let viewName = "";
      if (category === "men_open") {
        viewName = "men_open_team_list";
        filenameMode = "tn_men_open";
      } else if (category === "ladies_open") {
        viewName = "ladies_open_team_list";
        filenameMode = "tn_ladies_open";
      } else if (category === "mixed_open") {
        viewName = "mixed_open_team_list";
        filenameMode = "tn_mixed_open";
      } else if (category === "mixed_corporate") {
        viewName = "mixed_corporate_team_list";
        filenameMode = "tn_mixed_corporate";
      } else {
        // All TN categories - fetch from team_meta
        // Uses index: idx_team_meta_season for season filter
        // Uses index: idx_team_meta_created_at for sorting
        let query = supabaseServer.from("team_meta").select("*").order("created_at", { ascending: false });
        if (season) {
          query = query.eq("season", season);
        }
        const { data, error } = await executeQuery(
          () => query,
          "export_tn_all",
          "team_meta"
        );
        if (error) throw ApiErrors.badRequest(error.message);
        rows = data || [];
      }

      if (viewName) {
        // Views inherit indexes from underlying tables
        let query = supabaseServer.from(viewName).select("*").order("created_at", { ascending: false });
        if (season) {
          query = query.eq("season", season);
        }
        const { data, error } = await executeQuery(
          () => query,
          `export_tn_${viewName}`,
          viewName
        );
        if (error) throw ApiErrors.badRequest(error.message);
        rows = data || [];
      }
    } else if (mode === "wu") {
      // WU: Fetch from wu_team_meta
      // Uses index: idx_wu_team_meta_season for season filter
      // Uses index: idx_wu_team_meta_created_at for sorting
      let query = supabaseServer.from("wu_team_meta").select("*").order("created_at", { ascending: false });
      if (season) {
        query = query.eq("season", season);
      }
      const { data, error } = await executeQuery(
        () => query,
        "export_wu",
        "wu_team_meta"
      );
      if (error) throw ApiErrors.badRequest(error.message);
      rows = data || [];
    } else if (mode === "sc") {
      // SC: Fetch from sc_team_meta
      // Uses index: idx_sc_team_meta_season for season filter
      // Uses index: idx_sc_team_meta_created_at for sorting
      let query = supabaseServer.from("sc_team_meta").select("*").order("created_at", { ascending: false });
      if (season) {
        query = query.eq("season", season);
      }
      const { data, error } = await executeQuery(
        () => query,
        "export_sc",
        "sc_team_meta"
      );
      if (error) throw ApiErrors.badRequest(error.message);
      rows = data || [];
    } else if (mode === "all") {
      // All: Union of all tables (simplified - just return error for now)
      throw ApiErrors.badRequest("Mode 'all' not yet implemented. Please export TN, WU, and SC separately.");
    }

    if (rows.length === 0) {
      throw ApiErrors.notFound("No data found");
    }

    // Extract headers from first row
    headers = Object.keys(rows[0]);

    // UTF-8 BOM for Excel compatibility
    const BOM = "\uFEFF";
    const headerLine = headers.join(",");
    const dataLines = rows.map((row) => rowToCsv(row, headers));
    const csvContent = BOM + headerLine + "\n" + dataLines.join("\n");

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const filename = `SDBA_${filenameMode}_${timestamp}.csv`;

    // Return CSV with proper headers
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Export error:", error);
    return handleApiError(error);
  }
}


