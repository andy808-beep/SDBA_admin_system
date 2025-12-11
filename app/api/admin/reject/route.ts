import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { z } from "zod";

const RejectPayload = z.object({
  registration_id: z.string().uuid(),
  notes: z.string().min(1), // Notes required for reject
});

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      throw ApiErrors.forbidden();
    }

    // Parse and validate body
    const body = await req.json();
    const payload = RejectPayload.parse(body);
    
    // Call RPC function reject_registration
    const { data, error } = await supabaseServer.rpc("reject_registration", {
      reg_id: payload.registration_id,
      admin_user_id: user.id,
      notes: payload.notes,
    });

    if (error) {
      // Check if error is "not found or not pending"
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("not pending") ||
        errorMessage.includes("already_processed")
      ) {
        throw ApiErrors.conflict("Registration already processed or not found", "ALREADY_PROCESSED");
      }

      // Other database errors
      throw ApiErrors.internalServerError(error.message);
    }

    // Success: return ok
    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

