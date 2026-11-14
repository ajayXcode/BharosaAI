import { NextResponse } from "next/server";
import { persistWorkspace, verifyEvidence } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { documentId?: string };
  return withUser(async () => {
    try {
      const verification = verifyEvidence(body.documentId);
      await persistWorkspace();
      return NextResponse.json({ verification });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Verification failed" },
        { status: 400 },
      );
    }
  });
}
