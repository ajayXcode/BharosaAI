import { NextResponse } from "next/server";
import { workspaceOrEmpty } from "@/lib/bharosa";
import { withUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return withUser(async () => NextResponse.json(workspaceOrEmpty()));
}
