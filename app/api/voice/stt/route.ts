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
      const bytes = Buffer.from(await file.arrayBuffer());
      const filename = file.name && file.name.includes(".") ? file.name : "audio.webm";
      const contentType = file.type || "audio/webm";
      const chosen = LANGS.includes(lang) ? lang : "en";
      const result = await getSarvam().speechToText.transcribe({
        file: { data: bytes, filename, contentType },
        model: "saaras:v3",
        language_code: sarvamSttLanguage(chosen) as never,
        mode: "transcribe" as never,
      });
      const raw = result as unknown as Record<string, unknown>;
      const transcript =
        (typeof raw.transcript === "string" && raw.transcript.trim()) ||
        (typeof raw.text === "string" && raw.text.trim()) ||
        (Array.isArray(raw.transcripts) &&
          typeof (raw.transcripts[0] as Record<string, unknown> | undefined)?.transcript === "string" &&
          String((raw.transcripts[0] as Record<string, unknown>).transcript).trim()) ||
        "";
      if (!transcript) {
        return NextResponse.json(
          { error: "Could not understand the audio. Please try again." },
          { status: 422 },
        );
      }
      return NextResponse.json({
        transcript,
        language_code: typeof raw.language_code === "string" ? raw.language_code : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  });
}
