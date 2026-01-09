import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/auth";
import { handleApiError, ApiErrors, ApiError } from "@/lib/api-errors";
import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { setSentryUser } from "@/lib/sentry-context";

const CreateAdminUserPayload = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * @swagger
 * /api/admin/users/create:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a new admin user
 *     description: Create a new admin user account. Requires admin authentication and CSRF token.
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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address for the new admin user
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password for the new admin user (minimum 8 characters)
 *           example:
 *             email: "admin@example.com"
 *             password: "securepassword123"
 *     responses:
 *       200:
 *         description: Admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 user_id:
 *                   type: string
 *                   format: uuid
 *             example:
 *               ok: true
 *               user_id: "550e8400-e29b-41d4-a716-446655440000"
 *       403:
 *         description: Forbidden - authentication required or insufficient permissions
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
    const payload = CreateAdminUserPayload.parse(body);
    
    logger.info("Creating admin user", { email: payload.email, createdBy: user.id });

    // Use direct Supabase Admin API to create user
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      logger.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      throw ApiErrors.internalServerError("Service configuration error");
    }

    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            email: payload.email,
            password: payload.password,
            email_confirm: true,
            user_metadata: { is_admin: true },
          }),
        }
      );

      const responseText = await response.text();
      
      if (!response.ok) {
        logger.error("Failed to create admin user via Supabase API", {
          status: response.status,
          response: responseText,
          email: payload.email,
        });
        
        // Try to parse error message
        let errorMessage = "Failed to create admin user";
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error_description) {
            errorMessage = errorData.error_description;
          }
        } catch {
          // If parsing fails, use default message
        }

        // Check for common error cases
        if (response.status === 400) {
          throw ApiErrors.badRequest(errorMessage);
        } else if (response.status === 409 || responseText.includes("already registered")) {
          throw ApiErrors.conflict("User with this email already exists", "USER_EXISTS");
        } else {
          throw ApiErrors.internalServerError(errorMessage);
        }
      }

      const result = JSON.parse(responseText);
      
      logger.info("Admin user created successfully", {
        userId: result.id,
        email: payload.email,
        createdBy: user.id,
      });

      // Success: return user_id
      return NextResponse.json({
        ok: true,
        user_id: result.id,
      });
    } catch (fetchError: any) {
      logger.error("Error calling Supabase Admin API", {
        error: fetchError.message,
        email: payload.email,
      });
      
      if (fetchError instanceof ApiError) {
        throw fetchError;
      }
      
      throw ApiErrors.internalServerError("Failed to create admin user");
    }
  } catch (error) {
    return handleApiError(error);
  }
}

