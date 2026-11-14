import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** The authenticated Supabase user for this request, or null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}
