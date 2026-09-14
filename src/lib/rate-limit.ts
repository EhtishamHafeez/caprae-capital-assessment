import { LRUCache } from "lru-cache";

/**
 * Fixed-window rate limiting for the three routes that can call a paid LLM
 * API (outreach, insight, nl-search) — without this, one client hammering an
 * endpoint burns API budget with no upside. In-memory here (fine for a
 * single-process deployment); on serverless with multiple instances this
 * would move to Upstash Redis so limits are enforced across instances
 * instead of per cold-start — same interface, different backing store.
 */

const hits = new LRUCache<string, number[]>({ max: 5000, ttl: 5 * 60_000 });

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= max) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true };
}

/** Best-effort client identifier from standard proxy headers; falls back to a shared bucket if none are present (e.g. local dev). */
export function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
