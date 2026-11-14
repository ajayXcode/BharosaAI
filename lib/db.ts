import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let clientKey = "";

function envUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function envKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    ""
  );
}

export function dbConfigured() {
  return Boolean(envUrl() && envKey());
}

export function getDb(): SupabaseClient | null {
  const url = envUrl();
  const key = envKey();
  if (!url || !key) return null;
  const signature = `${url}|${key}`;
  if (!client || clientKey !== signature) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientKey = signature;
  }
  return client;
}

export interface DbHealth {
  configured: boolean;
  connected: boolean;
  project: string;
  latencyMs?: number;
  error?: string;
}

export async function dbHealth(): Promise<DbHealth> {
  if (!dbConfigured()) {
    return { configured: false, connected: false, project: "paytm-hackathon" };
  }
  const started = Date.now();
  try {
    const db = getDb()!;
    const { error } = await db
      .from("workspace_state")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw error;
    return {
      configured: true,
      connected: true,
      project: "paytm-hackathon",
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      project: "paytm-hackathon",
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown Supabase error",
    };
  }
}

export async function loadSnapshot<T>(id = "local"): Promise<T | null> {
  const db = getDb();
  if (!db) return null;
  const { data, error } = await db
    .from("workspace_state")
    .select("state")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data?.state as T | undefined) ?? null;
}

export async function saveSnapshot(state: unknown, id: string, userId?: string) {
  const db = getDb();
  if (!db) return false;
  const { error } = await db.from("workspace_state").upsert(
    { id, user_id: userId ?? null, state, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) throw error;
  return true;
}
