import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Plan } from "@/lib/plans";

export type { Plan };
export { PLANS } from "@/lib/plans";

const COOKIE = "bharosa_admin";

export function adminEmail() {
  return process.env.ADMIN_EMAIL || "admin@bharosa.ai";
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "BharosaAdmin@123";
}

export function adminDemoCredentials() {
  return { email: adminEmail(), password: adminPassword() };
}

export function isAdminRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return cookieHeader.split(/;\s*/).some((c) => c === `${COOKIE}=1`);
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function requireAdmin(req: Request): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin sign-in required" }, { status: 401 });
  }
  return null;
}
