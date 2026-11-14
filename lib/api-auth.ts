import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { runWithUser } from "@/lib/bharosa";

/**
 * Require a real Supabase session and run the handler inside that user's
 * private workspace. There is no anonymous or preview fallback: document data
 * is only reachable from an authenticated account.
 */
export async function withUser<T>(
  fn: (userId: string) => Promise<T>,
): Promise<T | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return runWithUser(user.id, () => fn(user.id));
}
