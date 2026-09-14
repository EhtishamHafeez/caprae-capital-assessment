import { LRUCache } from "lru-cache";

// In-memory, per-instance caches. Fine for a single-process demo deployment;
// on serverless (multiple cold-started instances with no shared memory) this
// would be swapped for Upstash Redis behind the same interface — see README
// "Caching" for the production note.

const queryCache = new LRUCache<string, object>({ max: 200, ttl: 60_000 });

export function cachedQuery<T extends object>(key: string, compute: () => T): T {
  const hit = queryCache.get(key);
  if (hit !== undefined) return hit as T;
  const value = compute();
  queryCache.set(key, value);
  return value;
}

/** A named, independently-configured string cache for one AI feature (outreach copy, insights, ...). */
export function makeAiCache(max: number, ttlMs: number) {
  const store = new LRUCache<string, string>({ max, ttl: ttlMs });
  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: string) => store.set(key, value),
  };
}
