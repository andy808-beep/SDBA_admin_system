import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
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
        return NextResponse.json({ 
          error: "Supabase API error",
          details: responseText,
          status: testResponse.status 
        }, { status: 400 });
      }

      const result = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        user: result,
        message: "Account created successfully! You can now log in.",
      });
    } catch (fetchError) {
      console.error("[Signup API] Direct fetch error:", fetchError);
      return NextResponse.json({ 
        error: "Failed to create user",
        details: fetchError instanceof Error ? fetchError.message : String(fetchError)
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

