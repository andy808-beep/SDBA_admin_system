"use client";

// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Access environment variables directly (embedded at build time)
// Don't use env.ts here to avoid validation issues on client
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.error('Missing Supabase environment variables. Please check your Vercel environment configuration.');
}

/**
 * Browser Supabase client (anon key).
 * Use this ONLY for:
 *  - Auth (signIn / signOut / OTP / magic link)
 *  - Reading the current session/user
 *
 * Do NOT use this to read/write protected tables.
 * Public forms should POST to your API routes instead.
 */
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
