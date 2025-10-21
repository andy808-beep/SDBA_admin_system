import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = window.ENV?.SUPABASE_URL;
const KEY = window.ENV?.SUPABASE_ANON_KEY;

console.log('🔗 Supabase Config: URL =', URL ? 'Present' : 'Missing');
console.log('🔗 Supabase Config: KEY =', KEY ? 'Present' : 'Missing');

if (!URL || !KEY) {
  console.error('🔗 Supabase Config: Missing environment variables');
  throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY. Did you load env.js?");
}

export const sb = createClient(URL, KEY, { auth: { persistSession: false } });
window.sb = sb;
console.log('🔗 Supabase Config: Client created successfully');
