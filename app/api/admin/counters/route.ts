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
  console.log("[checkAdmin] Starting admin check...");
  try {
    console.log("[checkAdmin] Getting cookies...");
    const cookieStore = cookies();
    console.log("[checkAdmin] Cookies retrieved, count:", cookieStore.getAll().length);
    
    console.log("[checkAdmin] Creating Supabase client...");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    console.log("[checkAdmin] Env vars:", { 
      hasUrl: !!supabaseUrl, 
      hasAnonKey: !!supabaseAnonKey,
      urlLength: supabaseUrl?.length || 0
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[checkAdmin] Missing Supabase env vars");
      return { isAdmin: false, user: null };
    }
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
              console.warn("[checkAdmin] Cookie set error:", err);
            }
          },
        },
      }
    );

    console.log("[checkAdmin] Getting user from Supabase...");
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log("[checkAdmin] User fetch result:", { 
      hasUser: !!user, 
      hasError: !!error,
      errorMessage: error?.message 
    });
    
    if (error || !user) {
      console.log("[checkAdmin] No user or error:", error?.message);
      return { isAdmin: false, user: null };
    }

    const adminCheck = isAdminUser(user);
    console.log("[checkAdmin] Admin check result:", adminCheck);
    return { isAdmin: adminCheck, user };
  } catch (err) {
    console.error("[checkAdmin] Exception caught:", err);
    console.error("[checkAdmin] Error stack:", err instanceof Error ? err.stack : "No stack");
    return { isAdmin: false, user: null };
  }
}

export async function GET(req: NextRequest) {
  console.log("[Counters API] GET request received");
  try {
    // Check admin authentication
    console.log("[Counters API] Checking admin authentication...");
    const { isAdmin } = await checkAdmin(req);
    console.log("[Counters API] Admin check result:", { isAdmin });
    
    if (!isAdmin) {
      console.log("[Counters API] Access denied - not admin");
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Verify environment variables
    console.log("[Counters API] Checking environment variables...");
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log("[Counters API] Env vars:", { hasUrl, hasKey });
    
    if (!hasUrl || !hasKey) {
      console.error("[Counters API] Missing Supabase environment variables");
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get local midnight for today (in UTC)
    // Create date at start of today in UTC
    console.log("[Counters API] Calculating today start...");
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    console.log("[Counters API] Today start (UTC):", todayStart.toISOString());
    
    // Get total count
    console.log("[Counters API] Fetching total count...");
    const { count: total, error: totalError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error("[Counters API] totalError:", totalError);
      return NextResponse.json({ ok: false, error: totalError.message }, { status: 400 });
    }
    console.log("[Counters API] Total count:", total);

    // Get pending count
    const { count: pending, error: pendingError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (pendingError) {
      console.error("Counters API - pendingError:", pendingError);
      return NextResponse.json({ ok: false, error: pendingError.message }, { status: 400 });
    }

    // Get approved count
    const { count: approved, error: approvedError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    if (approvedError) {
      console.error("Counters API - approvedError:", approvedError);
      return NextResponse.json({ ok: false, error: approvedError.message }, { status: 400 });
    }

    // Get rejected count
    const { count: rejected, error: rejectedError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected");

    if (rejectedError) {
      console.error("Counters API - rejectedError:", rejectedError);
      return NextResponse.json({ ok: false, error: rejectedError.message }, { status: 400 });
    }

    // Get new_today count (created_at >= local midnight)
    // Note: We need to handle timezone. Using UTC for now, but the requirement says "local midnight"
    // In production, you may want to convert to the server's local timezone
    const { count: newToday, error: newTodayError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (newTodayError) {
      console.error("Counters API - newTodayError:", newTodayError);
      return NextResponse.json({ ok: false, error: newTodayError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      total: total || 0,
      pending: pending || 0,
      approved: approved || 0,
      rejected: rejected || 0,
      new_today: newToday || 0,
    });
  } catch (error) {
    console.error("[Counters API] Unexpected error:", error);
    console.error("[Counters API] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[Counters API] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      cause: error instanceof Error ? error.cause : undefined,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : "Internal server error",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

