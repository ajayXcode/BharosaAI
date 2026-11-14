import { NextResponse } from "next/server";
import { act, persistWorkspace } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Parameters<typeof act>[0];
  return withUser(async () => {
    try {
      const result = act(body);
      await persistWorkspace();
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Action failed" },
        { status: 400 },
      );
    }
  });
}
