import { NextResponse } from "next/server";
import { compareLoans } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withUser(async () => {
    const body = (await request.json().catch(() => ({}))) as { a?: string; b?: string };
    if (!body.a || !body.b) {
      return NextResponse.json(
        { error: "Choose two loan documents to compare" },
        { status: 400 },
      );
    }
    try {
      return NextResponse.json(compareLoans(body.a, body.b));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Comparison failed" },
        { status: 400 },
      );
    }
  });
}
