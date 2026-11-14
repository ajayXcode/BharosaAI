import { NextResponse } from "next/server";
import {
  addStressNarrative,
  persistWorkspace,
  stressTest,
  type StressInput,
  workspace,
} from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as StressInput;
  return withUser(async () => {
    const limited = await rateLimit("stress", 30, 60_000);
    if (limited) return limited;
    try {
      const calculated = stressTest(body);
      const stress = await addStressNarrative(calculated);
      await persistWorkspace();
      return NextResponse.json({ stress, workspace: workspace() });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Stress test failed" },
        { status: 400 },
      );
    }
  });
}
