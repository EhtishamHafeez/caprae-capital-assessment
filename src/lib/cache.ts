import { LRUCache } from "lru-cache";

// In-memory, per-instance cache. Fine for a single-process demo deployment;
// on serverless (multiple cold-started instances with no shared memory) this
// would be swapped for Upstash Redis behind the same get/set interface — see
// README "Caching" for the production note.
const queryCache = new LRUCache<string, object>({ max: 200, ttl: 60_000 });
const outreachCache = new LRUCache<string, string>({ max: 500, ttl: 1000 * 60 * 60 * 24 });

export function cachedQuery<T extends object>(key: string, compute: () => T): T {
  const hit = queryCache.get(key);
  if (hit !== undefined) return hit as T;
  const value = compute();
  queryCache.set(key, value);
  return value;
}

export function getCachedOutreach(key: string): string | undefined {
  return outreachCache.get(key);
}

export function setCachedOutreach(key: string, value: string): void {
  outreachCache.set(key, value);
}
