import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { z } from "zod";
import { trackRpcCall, trackRegistrationEvent } from "@/lib/instrumentation/server";
import { setSentryUser } from "@/lib/sentry-context";
import { sanitizeNotes } from "@/lib/sanitize";
import { sendRegistrationConfirmation } from "@/lib/email";
import { logger } from "@/lib/logger";

const ApprovePayload = z.object({
  registration_id: z.string().uuid(),
  notes: z.string().optional().transform((val) => val ? sanitizeNotes(val) : undefined),
});

/**
 * @swagger
 * /api/admin/approve:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Approve a registration
 *     description: Approve a pending registration. Requires admin authentication and CSRF token.
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
 *             properties:
 *               registration_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the registration to approve
 *               notes:
 *                 type: string
 *                 description: Optional approval notes
 *           example:
 *             registration_id: "550e8400-e29b-41d4-a716-446655440000"
 *             notes: "Approved after review"
 *     responses:
 *       200:
 *         description: Registration approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 team_meta_id:
 *                   type: string
 *                   format: uuid
 *             example:
 *               ok: true
 *               team_meta_id: "660e8400-e29b-41d4-a716-446655440001"
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
    const payload = ApprovePayload.parse(body);
    
    // Call RPC function approve_registration with performance tracking
    const rpcParams = {
      reg_id: payload.registration_id,
      admin_user_id: user.id,
      notes: payload.notes || null,
    };
    
    const { data, error } = await trackRpcCall(
      async () => {
        const result = await supabaseServer.rpc("approve_registration", rpcParams);
        return result;
      },
      "approve_registration",
      rpcParams
    );

    if (error) {
      // Track failed approval (fire and forget)
      trackRegistrationEvent("approve", payload.registration_id, user.id, false, new Error(error.message)).catch(() => {});
      
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

    // Track successful approval (fire and forget)
    trackRegistrationEvent("approve", payload.registration_id, user.id, true).catch(() => {});

    // Send confirmation email (fire and forget - don't block response)
    sendConfirmationEmail(payload.registration_id).catch((err) => {
      logger.error('Background email send failed:', err);
    });

    // Success: return team_meta_id
    return NextResponse.json({
      ok: true,
      team_meta_id: data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetch registration details and send confirmation email
 * Runs in background - errors are logged but don't affect response
 */
async function sendConfirmationEmail(registrationId: string): Promise<void> {
  // Fetch registration details
  const { data: registration, error: fetchError } = await supabaseServer
    .from('registration_meta')
    .select('*')
    .eq('id', registrationId)
    .single();

  if (fetchError || !registration) {
    logger.error('Failed to fetch registration for email:', fetchError?.message);
    return;
  }

  // Collect emails (filter out empty/null)
  const emails = [
    registration.email_1,
    registration.email_2,
    registration.email_3,
  ].filter((e): e is string => Boolean(e));

  if (emails.length === 0) {
    logger.warn('No emails found for registration:', registrationId);
    return;
  }

  // Send email
  const result = await sendRegistrationConfirmation({
    emails,
    managerName: registration.team_manager_1 || 'Team Manager',
    teamName: registration.team_name,
    eventType: registration.event_type,
    category: registration.category || '',
    referenceNumber: registration.reference_number || registrationId.slice(0, 8).toUpperCase(),
    totalAmount: registration.total_amount,
  });

  if (!result.success) {
    logger.error('Email send failed for registration:', registrationId, result.error);
  } else {
    logger.debug('Confirmation email sent for registration:', registrationId);
  }
}

