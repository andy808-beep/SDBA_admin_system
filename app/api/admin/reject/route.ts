import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
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
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    let body;
    try {
      body = await req.json();
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
          return NextResponse.json(
            { ok: false, error: "already_processed" },
            { status: 409 }
          );
        }

        // Other errors -> 500
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      // Success: return ok
      return NextResponse.json({
        ok: true,
      });
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        return NextResponse.json(
          { ok: false, error: "Invalid input", detail: parseError.issues },
          { status: 422 }
        );
      }
      throw parseError;
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

