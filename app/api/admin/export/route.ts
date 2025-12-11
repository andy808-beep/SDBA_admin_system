import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

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

export async function POST(req: NextRequest) {
  try {
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
        let query = supabaseServer.from("team_meta").select("*").order("created_at", { ascending: false });
        if (season) {
          query = query.eq("season", season);
        }
        const { data, error } = await query;
        if (error) throw ApiErrors.badRequest(error.message);
        rows = data || [];
      }

      if (viewName) {
        let query = supabaseServer.from(viewName).select("*").order("created_at", { ascending: false });
        if (season) {
          query = query.eq("season", season);
        }
        const { data, error } = await query;
        if (error) throw ApiErrors.badRequest(error.message);
        rows = data || [];
      }
    } else if (mode === "wu") {
      // WU: Fetch from wu_team_meta
      let query = supabaseServer.from("wu_team_meta").select("*").order("created_at", { ascending: false });
      if (season) {
        query = query.eq("season", season);
      }
      const { data, error } = await query;
      if (error) throw ApiErrors.badRequest(error.message);
      rows = data || [];
    } else if (mode === "sc") {
      // SC: Fetch from sc_team_meta
      let query = supabaseServer.from("sc_team_meta").select("*").order("created_at", { ascending: false });
      if (season) {
        query = query.eq("season", season);
      }
      const { data, error } = await query;
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


