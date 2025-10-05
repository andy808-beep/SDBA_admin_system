// lib/supabaseServer.ts (server-only)
import { createClient } from "@supabase/supabase-js";

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,        // same URL
  process.env.SUPABASE_SERVICE_ROLE_KEY!,       // SERVER KEY (never expose)
  { auth: { persistSession: false } }
);
