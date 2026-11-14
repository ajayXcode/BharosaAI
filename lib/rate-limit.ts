import { headers } from "next/headers";
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Small in-process sliding window. Enough to stop a single client hammering
 * a route; a multi-instance deployment should move this to Redis.
 */
export async function rateLimit(scope: string, limit: number, windowMs: number) {
  const headerBag = await headers();
  const forwarded = headerBag.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headerBag.get("x-real-ip") || "local";
  const key = `${scope}:ip:${ip}`;
  const now = Date.now();
  sweep(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: `Too many requests. Try again in ${retryAfter}s.` },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
