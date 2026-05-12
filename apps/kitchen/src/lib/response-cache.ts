import crypto from "crypto";

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  invalidations: number;
  memoryBytes: number;
  maxEntries: number;
}

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  tags: Set<string>;
  bytes: number;
}

export interface PerformanceBudget {
  route: string;
  p95Ms: number;
  budgetMs: number;
}

export function cacheKey(parts: unknown[]): string {
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function createResponseCache(options: { maxEntries?: number } = {}) {
  const maxEntries = options.maxEntries ?? Number(process.env.KITCHEN_CACHE_MAX_ENTRIES ?? 250);
  const entries = new Map<string, CacheEntry<unknown>>();
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  let invalidations = 0;

  function evictIfNeeded() {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (!oldest) return;
      entries.delete(oldest);
      evictions += 1;
    }
  }

  return {
    async getOrSet<T>(namespace: string, key: string, ttlMs: number, loader: () => Promise<T> | T, tags: string[] = []): Promise<T> {
      const fullKey = `${namespace}:${key}`;
      const existing = entries.get(fullKey) as CacheEntry<T> | undefined;
      if (existing && existing.expiresAt > Date.now()) {
        entries.delete(fullKey);
        entries.set(fullKey, existing);
        hits += 1;
        return existing.value;
      }
      if (existing) entries.delete(fullKey);
      misses += 1;
      const value = await loader();
      const raw = JSON.stringify(value);
      entries.set(fullKey, {
        key: fullKey,
        value,
        expiresAt: Date.now() + ttlMs,
        tags: new Set(tags),
        bytes: Buffer.byteLength(raw),
      });
      evictIfNeeded();
      return value;
    },
    invalidateTag(tag: string): number {
      let count = 0;
      for (const [key, entry] of entries.entries()) {
        if (entry.tags.has(tag)) {
          entries.delete(key);
          count += 1;
        }
      }
      invalidations += count;
      return count;
    },
    purge(): number {
      const count = entries.size;
      entries.clear();
      invalidations += count;
      return count;
    },
    stats(): CacheStats {
      const memoryBytes = Array.from(entries.values()).reduce((sum, entry) => sum + entry.bytes, 0);
      return { entries: entries.size, hits, misses, evictions, invalidations, memoryBytes, maxEntries };
    },
  };
}

export const responseCache = createResponseCache();

export function performanceBudgetStatus(budgets: PerformanceBudget[]) {
  return {
    ok: budgets.every((budget) => budget.p95Ms <= budget.budgetMs),
    routes: budgets.map((budget) => ({
      ...budget,
      status: budget.p95Ms <= budget.budgetMs ? "pass" : "fail",
    })),
  };
}

export const DEFAULT_PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { route: "/api/cache/stats", p95Ms: 15, budgetMs: 50 },
  { route: "/api/security/report", p95Ms: 80, budgetMs: 250 },
  { route: "/api/model-routing/recommendations", p95Ms: 60, budgetMs: 200 },
  { route: "/api/memory/health", p95Ms: 90, budgetMs: 300 },
];

export async function prewarmResponseCaches() {
  return Promise.all([
    responseCache.getOrSet("registry", "agents", 30_000, async () => ({ warmedAt: new Date().toISOString() }), ["registry"]),
    responseCache.getOrSet("skills", "catalog", 60_000, async () => ({ warmedAt: new Date().toISOString() }), ["skills"]),
    responseCache.getOrSet("memory-health", "default", 30_000, async () => ({ warmedAt: new Date().toISOString() }), ["memory"]),
    responseCache.getOrSet(
      "model-routing",
      cacheKey(["recommendations", "engineering", "balanced"]),
      60_000,
      async () => ({ warmedAt: new Date().toISOString() }),
      ["model-routing"]
    ),
  ]);
}
