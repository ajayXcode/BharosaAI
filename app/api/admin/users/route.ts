import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import type { Plan } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
  plan: Plan;
  documents: number;
}

const PLANS: Plan[] = ["free", "pro", "enterprise"];

function planOf(metadata: Record<string, unknown> | undefined | null): Plan {
  const value = metadata?.plan;
  return PLANS.includes(value as Plan) ? (value as Plan) : "free";
}

export async function GET(request: Request) {
  const gate = requireAdmin(request);
  if (gate) return gate;

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;

    // Optional enrichment: this table only exists after the plans migration.
    const { data: plans } = await admin
      .from("user_plans")
      .select("user_id, plan, full_name")
      .then((result) => (result.error ? { data: null } : result));

    const { data: workspaces } = await admin
      .from("workspace_state")
      .select("user_id, state");

    const planMap = new Map(
      (plans ?? []).map((row) => [row.user_id as string, row as { plan: Plan; full_name: string | null }]),
    );
    const docMap = new Map<string, number>();
    for (const row of workspaces ?? []) {
      const state = row.state as { docs?: unknown[] } | null;
      if (row.user_id) docMap.set(row.user_id as string, Array.isArray(state?.docs) ? state.docs.length : 0);
    }

    const users: AdminUser[] = (data?.users ?? []).map((user) => {
      const planRow = planMap.get(user.id);
      const provider =
        (user.app_metadata?.provider as string | undefined) ??
        (user.identities?.[0]?.provider as string | undefined) ??
        "email";
      return {
        id: user.id,
        email: user.email ?? "—",
        name:
          planRow?.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          (user.app_metadata?.full_name as string | undefined) ||
          (user.email ?? "—").split("@")[0],
        provider,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        plan: planRow?.plan ?? planOf(user.app_metadata),
        documents: docMap.get(user.id) ?? 0,
      };
    });

    users.sort((a, b) => (b.lastSignInAt ?? b.createdAt).localeCompare(a.lastSignInAt ?? a.createdAt));

    return NextResponse.json({
      ok: true,
      users,
      totals: {
        users: users.length,
        free: users.filter((u) => u.plan === "free").length,
        pro: users.filter((u) => u.plan === "pro").length,
        enterprise: users.filter((u) => u.plan === "enterprise").length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not load users: ${error.message}`
            : "Could not load users",
      },
      { status: 500 },
    );
  }
}
