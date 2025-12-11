import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { env } from "@/lib/env";

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

    // Environment variables are validated at startup via lib/env.ts
    // No need to check here - if we got this far, they're valid

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

