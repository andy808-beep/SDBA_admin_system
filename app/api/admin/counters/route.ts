import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { handleApiError, ApiErrors } from "@/lib/api-errors";

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
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    logger.debug("[Counters API] Today start (UTC):", todayStart.toISOString());
    
    // Get total count
    logger.debug("[Counters API] Fetching total count...");
    const { count: total, error: totalError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      logger.error("[Counters API] totalError:", totalError);
      throw ApiErrors.badRequest(totalError.message);
    }
    logger.debug("[Counters API] Total count:", total);

    // Get pending count
    const { count: pending, error: pendingError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (pendingError) {
      logger.error("[Counters API] pendingError:", pendingError);
      throw ApiErrors.badRequest(pendingError.message);
    }

    // Get approved count
    const { count: approved, error: approvedError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    if (approvedError) {
      logger.error("[Counters API] approvedError:", approvedError);
      throw ApiErrors.badRequest(approvedError.message);
    }

    // Get rejected count
    const { count: rejected, error: rejectedError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected");

    if (rejectedError) {
      logger.error("[Counters API] rejectedError:", rejectedError);
      throw ApiErrors.badRequest(rejectedError.message);
    }

    // Get new_today count (created_at >= local midnight)
    // Note: Using UTC for now, but the requirement says "local midnight"
    // In production, you may want to convert to the server's local timezone
    const { count: newToday, error: newTodayError } = await supabaseServer
      .from("registration_meta")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (newTodayError) {
      logger.error("[Counters API] newTodayError:", newTodayError);
      throw ApiErrors.badRequest(newTodayError.message);
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
    logger.error("[Counters API] Unexpected error:", error);
    if (error instanceof Error) {
      logger.error("[Counters API] Error stack:", error.stack);
    }
    return handleApiError(error);
  }
}

