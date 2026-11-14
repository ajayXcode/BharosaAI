import { NextResponse } from "next/server";
import { escalate, persistWorkspace } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as {
      documentId?: string;
      reason?: string;
    };
    if (!body.documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }
    try {
      const escalation = escalate(body.documentId, body.reason ?? "");
      await persistWorkspace();
      return NextResponse.json({ escalation });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Escalation failed" },
        { status: 400 },
      );
    }
  });
}
