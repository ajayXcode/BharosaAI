import { NextResponse } from "next/server";
import { persistWorkspace, translate, type Lang } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const LANGS: Lang[] = ["en", "hi", "hinglish"];

export async function POST(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as { lang?: Lang };
    if (!body.lang || !LANGS.includes(body.lang)) {
      return NextResponse.json({ error: "Choose en, hi or hinglish" }, { status: 400 });
    }
    try {
      const analysis = translate(body.lang);
      await persistWorkspace();
      return NextResponse.json(analysis);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Translation failed" },
        { status: 400 },
      );
    }
  });
}
