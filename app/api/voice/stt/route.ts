import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSarvam, sarvamEnabled, sarvamSttLanguage } from "@/lib/sarvam";
import type { Lang } from "@/lib/bharosa";

export const dynamic = "force-dynamic";

const LANGS: Lang[] = ["en", "hi", "hinglish"];

export async function POST(request: Request) {
  return withUser(async () => {
    if (!sarvamEnabled()) {
      return NextResponse.json(
        { error: "Voice transcription is not configured." },
        { status: 503 },
      );
    }
    const limited = await rateLimit("voice-stt", 30, 60_000);
    if (limited) return limited;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const lang = String(form?.get("lang") ?? "en") as Lang;
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Record or upload an audio clip first." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio must be 10 MB or smaller." }, { status: 400 });
    }

    try {
      const result = await getSarvam().speechToText.transcribe({
        file,
        model: "saaras:v3",
        language_code: sarvamSttLanguage(LANGS.includes(lang) ? lang : "en"),
      });
      const transcript =
        typeof (result as { transcript?: unknown }).transcript === "string"
          ? ((result as { transcript: string }).transcript || "").trim()
          : "";
      if (!transcript) {
        return NextResponse.json(
          { error: "Could not understand the audio. Please try again." },
          { status: 422 },
        );
      }
      return NextResponse.json({
        transcript,
        language_code:
          typeof (result as { language_code?: unknown }).language_code === "string"
            ? (result as { language_code: string }).language_code
            : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  });
}
