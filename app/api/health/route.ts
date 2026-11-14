import { NextResponse } from "next/server";
import { dbHealth } from "@/lib/db";
import { nvidiaEnabled, NVIDIA_MODEL } from "@/lib/nvidia";
import { pineconeHealth } from "@/lib/pinecone";
import { sarvamEnabled } from "@/lib/sarvam";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, vectors] = await Promise.all([dbHealth(), pineconeHealth()]);
  return NextResponse.json({
    ok: database.connected && vectors.connected,
    database,
    vectors,
    ai: {
      nvidia: nvidiaEnabled() ? "configured" : "missing_key",
      model: NVIDIA_MODEL,
      evidence_gate: true,
    },
    voice: {
      sarvam: sarvamEnabled() ? "configured" : "missing_key",
    },
    checkedAt: new Date().toISOString(),
  });
}
