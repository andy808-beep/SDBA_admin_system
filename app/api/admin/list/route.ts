import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

// Reuse admin check logic from middleware.ts
function isAdminUser(user: any) {
  const roles = (user?.app_metadata?.roles ?? user?.user_metadata?.roles ?? []) as string[];
  const role = (user?.app_metadata?.role ?? user?.user_metadata?.role) as string | undefined;
  return roles?.includes("admin") || role === "admin" || user?.user_metadata?.is_admin === true;
}

async function checkAdmin(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
              console.warn("Cookie set error:", err);
            }
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false, user: null };
    }

    return { isAdmin: isAdminUser(user), user };
  } catch (err) {
    console.error("checkAdmin error:", err);
    return { isAdmin: false, user: null };
  }
}

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

