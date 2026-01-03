import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20),
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasResend: !!process.env.RESEND_API_KEY,
  });
}
