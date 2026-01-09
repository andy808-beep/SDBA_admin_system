// app/api/admin/registration/[id]/route.ts
// Fetch a single registration with all fields for editing

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/admin/registration/{id}:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get a single registration
 *     description: Fetch a registration by ID with all fields needed for editing. Requires admin authentication.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Registration UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Registration data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 registration:
 *                   type: object
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
 *       404:
 *         description: Registration not found
 *       422:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const { isAdmin } = await checkAdmin(req);
    if (!isAdmin) {
      throw ApiErrors.forbidden();
    }

    // Extract and validate id from params (params is a Promise in Next.js 13+)
    const { id } = await params;
    const validatedId = z.string().uuid().parse(id);

    // Log the fetch action
    logger.info("Fetching registration for edit", {
      registrationId: validatedId,
    });

    // Fetch registration with all fields using service_role (bypasses RLS)
    const { data, error } = await supabaseServer
      .from("registration_meta")
      .select(`
        id,
        registration_number,
        status,
        event_type,
        season,
        team_name_en,
        team_name_tc,
        division_code,
        option_choice,
        package_choice,
        org_name,
        org_address,
        team_manager_1,
        mobile_1,
        email_1,
        team_manager_2,
        mobile_2,
        email_2,
        team_manager_3,
        mobile_3,
        email_3,
        marquee_qty,
        race_day_steersman_option,
        junk_boat_qty,
        junk_boat_license_nos,
        speed_boat_qty,
        speed_boat_license_nos,
        admin_notes,
        created_at,
        updated_at
      `)
      .eq("id", validatedId)
      .single();

    // Handle errors
    if (error) {
      // PGRST116 = no rows returned
      if (error.code === "PGRST116") {
        logger.warn("Registration not found", {
          registrationId: validatedId,
        });
        return NextResponse.json(
          {
            ok: false,
            error: "Registration not found",
          },
          { status: 404 }
        );
      }

      // Other database errors
      logger.error("Error fetching registration", {
        registrationId: validatedId,
        error: error.message,
        code: error.code,
      });
      throw ApiErrors.internalServerError(error.message);
    }

    if (!data) {
      logger.warn("Registration not found (null data)", {
        registrationId: validatedId,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Registration not found",
        },
        { status: 404 }
      );
    }

    // Success: return registration data
    return NextResponse.json({
      ok: true,
      registration: data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

