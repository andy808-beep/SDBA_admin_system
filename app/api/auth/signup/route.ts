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

    console.log("[Signup API] URL:", env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30));
    console.log("[Signup API] Has Service Key:", !!env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("[Signup API] Key length:", env.SUPABASE_SERVICE_ROLE_KEY.length);
    console.log("[Signup API] Key first 20 chars:", env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20));

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
      console.log("[Signup API] Direct fetch status:", testResponse.status);
      console.log("[Signup API] Direct fetch response:", responseText);
      
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
    } catch (fetchError: any) {
      console.error("[Signup API] Direct fetch error:", fetchError);
      return NextResponse.json({ 
        error: "Failed to create user",
        details: fetchError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: "Account created successfully! You can now log in.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

