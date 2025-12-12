import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { handleApiError, ApiErrors } from "@/lib/api-errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      throw ApiErrors.badRequest("Email and password are required");
    }

    const cookieStore = await cookies();
    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
    });

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
                // Also set on response
                response.cookies.set(name, value, options);
              });
            } catch (err) {
              console.warn("Cookie set error:", err);
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw ApiErrors.unauthorized(error.message);
    }

    // Login successful - cookies set automatically by Supabase
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

