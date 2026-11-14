import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/server";

/** Service-role client. Server only — never import from a client component. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
