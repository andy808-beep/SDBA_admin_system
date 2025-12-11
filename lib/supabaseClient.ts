"use client";

// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

const url  = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
