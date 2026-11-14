import { NextResponse } from "next/server";
import { adminDemoCredentials, setAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const demo = adminDemoCredentials();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (email !== demo.email.toLowerCase() || password !== demo.password) {
    return NextResponse.json({ error: "Invalid admin email or password" }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
