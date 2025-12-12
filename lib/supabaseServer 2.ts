// lib/supabaseServer.ts (server-only)
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Validate server env vars when this module loads (server-side only)
env.SUPABASE_SERVICE_ROLE_KEY; // This triggers validation

export const supabaseServer = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,        // same URL
  env.SUPABASE_SERVICE_ROLE_KEY,       // SERVER KEY (never expose)
  { auth: { persistSession: false } }
);
