import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { env } from "@/lib/env";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      throw ApiErrors.badRequest("Email and password are required");
    }

    // Debug logging removed - use logger.debug() if needed for development

    // Test: Try to make a direct API call to see what Supabase returns
    try {
      const testResponse = await fetch(
        `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: { is_admin: true },
          }),
        }
      );

      const responseText = await testResponse.text();
      
      if (!testResponse.ok) {
        throw ApiErrors.badRequest(`Supabase API error: ${responseText}`);
      }

      const result = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        user: result,
        message: "Account created successfully! You can now log in.",
      });
    } catch (fetchError) {
      logger.error("[Signup API] Direct fetch error:", fetchError);
      throw ApiErrors.internalServerError(
        fetchError instanceof Error ? fetchError.message : "Failed to create user"
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

