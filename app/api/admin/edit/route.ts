import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";

/**
 * @swagger
 * /api/admin/edit:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Edit a registration
 *     description: Update fields of a registration. Requires admin authentication and CSRF token.
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
 *               - registrationId
 *               - updates
 *             properties:
 *               registrationId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the registration to edit
 *               updates:
 *                 type: object
 *                 description: Key-value pairs of fields to update
 *                 additionalProperties: true
 *           example:
 *             registrationId: "550e8400-e29b-41d4-a716-446655440000"
 *             updates:
 *               team_name_en: "Updated Team Name"
 *               admin_notes: "Updated notes"
 *     responses:
 *       200:
 *         description: Registration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 registration_id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                 event_type:
 *                   type: string
 *                 team_updated:
 *                   type: boolean
 *             example:
 *               ok: true
 *               registration_id: "550e8400-e29b-41d4-a716-446655440000"
 *               status: "approved"
 *               event_type: "tn"
 *               team_updated: true
 *       400:
 *         description: Bad request - invalid input or RPC error
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - insufficient permissions or invalid CSRF
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Check admin auth
    const { isAdmin, user } = await checkAdmin(req);
    if (!isAdmin || !user) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // 2. Parse body
    const body = await req.json();
    
    // 3. Manual validation (no Zod)
    const { registrationId, updates } = body;
    
    if (!registrationId || typeof registrationId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'registrationId is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Simple UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(registrationId)) {
      return NextResponse.json(
        { ok: false, error: 'registrationId must be a valid UUID' },
        { status: 400 }
      );
    }
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'updates is required and must be an object' },
        { status: 400 }
      );
    }
    
    // 4. Call RPC directly
    const { data, error } = await supabaseServer.rpc('update_registration', {
      reg_id: registrationId,
      admin_user_id: user.id,
      updates: updates
    });
    
    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }
    
    // 5. Check RPC success flag
    if (data && data.success === false) {
      return NextResponse.json(
        { ok: false, error: data.error || 'Update failed' },
        { status: 400 }
      );
    }
    
    // 6. Log and return success
    console.log('Registration updated:', {
      registrationId,
      adminUserId: user.id,
      status: data?.status,
      teamUpdated: data?.team_updated
    });
    
    return NextResponse.json({
      ok: true,
      success: true,
      registration_id: data?.registration_id,
      status: data?.status,
      event_type: data?.event_type,
      team_updated: data?.team_updated
    });
    
  } catch (err) {
    console.error('Edit route error:', err);
    return handleApiError(err);
  }
}

