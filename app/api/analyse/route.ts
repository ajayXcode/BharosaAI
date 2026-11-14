import { NextResponse } from "next/server";
import { analyseDoc, persistWorkspace, workspace } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as { documentId?: string };
    if (!body.documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }
    try {
      analyseDoc(body.documentId);
      await persistWorkspace();
      return NextResponse.json(workspace());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Analysis failed" },
        { status: 400 },
      );
    }
  });
}
