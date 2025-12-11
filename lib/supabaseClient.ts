"use client";

// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Note: Can't use logger here as it's server-side only
// Client-side logging should be minimal

// Lazy initialization - only create client when actually used (browser only)
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Client-side: Access NEXT_PUBLIC_* vars directly (they're available in the browser)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // During build/SSR, use placeholder values that Supabase will accept
  const finalUrl = url || 'https://placeholder.supabase.co';
  const finalAnon = anon || 'placeholder-anon-key';

  if (!url || !anon) {
    if (typeof window !== 'undefined') {
      // Only log error in browser (not during SSR/build)
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  }

  supabaseInstance = createClient(finalUrl, finalAnon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return supabaseInstance;
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
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
