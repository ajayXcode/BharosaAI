import { NextResponse } from "next/server";
import { withUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSarvam, sarvamEnabled, sarvamSpeaker, sarvamTtsLanguage } from "@/lib/sarvam";
import type { Lang } from "@/lib/bharosa";

export const dynamic = "force-dynamic";

const LANGS: Lang[] = ["en", "hi", "hinglish"];

export async function POST(request: Request) {
  return withUser(async () => {
    if (!sarvamEnabled()) {
      return NextResponse.json(
        { error: "Voice playback is not configured." },
        { status: 503 },
      );
    }
    const limited = await rateLimit("voice-tts", 30, 60_000);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { text?: string; lang?: Lang };
    const text = (body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 2400);
    if (!text) {
      return NextResponse.json({ error: "Nothing to read aloud." }, { status: 400 });
    }
    const lang = LANGS.includes(body.lang ?? "en") ? (body.lang as Lang) : "en";

    try {
      const result = await getSarvam().textToSpeech.convert({
        text,
        language_code: sarvamTtsLanguage(lang) as never,
        speaker: sarvamSpeaker(lang) as never,
        model: "bulbul:v3",
        enable_preprocessing: true,
      });
      const audios = (result as { audios?: unknown }).audios;
      const audio = Array.isArray(audios) && typeof audios[0] === "string" ? audios[0] : null;
      if (!audio) {
        return NextResponse.json({ error: "Could not generate audio." }, { status: 502 });
      }
      return NextResponse.json({ audio, format: "wav" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speech generation failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  });
}
