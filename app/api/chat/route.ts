import { NextResponse } from "next/server";
import { ask, persistWorkspace, type Lang } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LANGS: Lang[] = ["en", "hi", "hinglish"];

export async function POST(request: Request) {
  return withUser(async () => {
    const limited = await rateLimit("chat", 20, 60_000);
    if (limited) return limited;
    const body = (await request.json().catch(() => ({}))) as {
      documentId?: string;
      question?: string;
      lang?: Lang;
    };
    if (!body.documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }
    try {
      const requested = body.lang ?? "en";
      const lang: Lang = LANGS.includes(requested) ? requested : "en";
      const result = await ask(body.documentId, body.question ?? "", lang);
      await persistWorkspace();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not answer" },
        { status: 400 },
      );
    }
  });
}
