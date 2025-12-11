import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "all";
    const event = searchParams.get("event") || "all";
    const seasonParam = searchParams.get("season");

    // Build query
    let query = supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact" });

    // Search filter
    if (q) {
      // Escape special characters for PostgREST filter
      const escapedQ = q.replace(/[%'"]/g, (char) => {
        if (char === '%') return '\\%';
        if (char === "'") return "''";
        return char;
      });
      const searchPattern = `%${escapedQ}%`;
      query = query.or(
        `team_name.ilike.${searchPattern},org_name.ilike.${searchPattern},email_1.ilike.${searchPattern},team_code.ilike.${searchPattern}`
      );
    }

    // Status filter
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Event type filter
    if (event !== "all") {
      query = query.eq("event_type", event);
    }

    // Season filter
    if (seasonParam) {
      const season = parseInt(seasonParam, 10);
      if (!isNaN(season)) {
        query = query.eq("season", season);
      }
    }

    // Sort: created_at DESC
    query = query.order("created_at", { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count: totalCount } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Transform response items
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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

