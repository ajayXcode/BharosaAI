import { NextResponse } from "next/server";
import { metricsFor } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async () => NextResponse.json({ metrics: metricsFor() }));
}
