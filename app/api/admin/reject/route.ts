import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { z } from "zod";
import { trackRpcCall, trackRegistrationEvent } from "@/lib/instrumentation/server";
import { setSentryUser } from "@/lib/sentry-context";
import { sanitizeNotes, sanitizeText, validateEmail } from "@/lib/sanitize";

const RejectPayload = z.object({
  registration_id: z.string().uuid(),
  notes: z.string().min(1).transform(sanitizeNotes), // Notes required for reject
});

/**
 * @swagger
 * /api/admin/reject:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Reject a registration
 *     description: Reject a pending registration. Requires admin authentication, CSRF token, and rejection notes.
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
 *               - registration_id
 *               - notes
 *             properties:
 *               registration_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the registration to reject
 *               notes:
 *                 type: string
 *                 minLength: 1
 *                 description: Rejection notes (required)
 *           example:
 *             registration_id: "550e8400-e29b-41d4-a716-446655440000"
 *             notes: "Incomplete information provided"
 *     responses:
 *       200:
 *         description: Registration rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *             example:
 *               ok: true
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
 *       409:
 *         description: Conflict - registration already processed or not found
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
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      throw ApiErrors.forbidden();
    }

    // Set user context in Sentry
    setSentryUser(user);

    // Parse and validate body
    const body = await req.json();
    const payload = RejectPayload.parse(body);
    
    // Call RPC function reject_registration with performance tracking
    const rpcParams = {
      reg_id: payload.registration_id,
      admin_user_id: user.id,
      notes: payload.notes,
    };
    
    const { data, error } = await trackRpcCall(
      async () => {
        const result = await supabaseServer.rpc("reject_registration", rpcParams);
        return result;
      },
      "reject_registration",
      rpcParams
    );

    if (error) {
      // Track failed rejection (fire and forget)
      trackRegistrationEvent("reject", payload.registration_id, user.id, false, new Error(error.message)).catch(() => {});
      
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

    // Track successful rejection (fire and forget)
    trackRegistrationEvent("reject", payload.registration_id, user.id, true).catch(() => {});

    // Success: return ok
    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

