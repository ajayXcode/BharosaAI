import { SarvamAIClient } from "sarvamai";
import type { Lang } from "@/lib/bharosa";

let client: SarvamAIClient | null = null;

export function sarvamEnabled() {
  return Boolean(process.env.SARVAM_API_KEY);
}

export function getSarvam() {
  if (!process.env.SARVAM_API_KEY) {
    throw new Error("Voice is not configured on this server.");
  }
  if (!client) {
    client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY,
    });
  }
  return client;
}

export function sarvamSttLanguage(lang: Lang) {
  if (lang === "hi") return "hi-IN";
  if (lang === "hinglish") return "en-IN";
  return "unknown";
}

export function sarvamTtsLanguage(lang: Lang) {
  if (lang === "hi") return "hi-IN";
  return "en-IN";
}

export function sarvamSpeaker(lang: Lang) {
  return lang === "hi" ? "shubh" : "anushka";
}
