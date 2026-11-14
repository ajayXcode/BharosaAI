import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import type { Plan } from "@/lib/plans";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PLANS: Plan[] = ["free", "pro", "enterprise"];

export async function POST(request: Request) {
  const gate = requireAdmin(request);
  if (gate) return gate;

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    plan?: string;
    email?: string;
    name?: string;
  };
  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!PLANS.includes(body.plan as Plan)) {
    return NextResponse.json({ error: "plan must be free, pro or enterprise" }, { status: 400 });
  }
  const plan = body.plan as Plan;

  try {
    const admin = supabaseAdmin();

    // app_metadata is writable only by the service role, so the granted plan
    // cannot be escalated by the user from the client.
    const { data: existing, error: readError } = await admin.auth.admin.getUserById(body.userId);
    if (readError) throw readError;

    const { error: updateError } = await admin.auth.admin.updateUserById(body.userId, {
      app_metadata: {
        ...(existing.user?.app_metadata ?? {}),
        plan,
        plan_updated_at: new Date().toISOString(),
      },
    });
    if (updateError) throw updateError;

    // Best-effort mirror for reporting; skipped when the migration is absent.
    await admin
      .from("user_plans")
      .upsert(
        {
          user_id: body.userId,
          email: body.email ?? null,
          full_name: body.name ?? null,
          plan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .then((result) => (result.error ? null : result));

    return NextResponse.json({ ok: true, userId: body.userId, plan });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `Could not update plan: ${error.message}` : "Could not update plan",
      },
      { status: 500 },
    );
  }
}
