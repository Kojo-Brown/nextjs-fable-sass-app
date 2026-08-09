import "server-only";
import { headers } from "next/headers";

/* Fixed-window in-memory limiter. Correct for a single Node process (this
 * app's self-host target); on serverless or multi-instance deploys swap the
 * Map for Redis/Upstash — the call sites don't change. */

type Window = { count: number; resetAt: number };

const globalForRl = globalThis as unknown as { rlBuckets?: Map<string, Window> };
const buckets = (globalForRl.rlBuckets ??= new Map<string, Window>());

export async function rateLimit(
  scope: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "local";

  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
