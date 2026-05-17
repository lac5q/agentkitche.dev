import { describe, expect, it } from "vitest";
import {
  createResponseCache,
  performanceBudgetStatus,
} from "../response-cache";

describe("response cache", () => {
  it("caches values with TTL and tracks hit/miss stats", async () => {
    const cache = createResponseCache({ maxEntries: 2 });
    let calls = 0;

    const first = await cache.getOrSet("memory", "query-a", 1000, async () => {
      calls += 1;
      return { value: 1 };
    });
    const second = await cache.getOrSet("memory", "query-a", 1000, async () => {
      calls += 1;
      return { value: 2 };
    });

    expect(first).toEqual(second);
    expect(calls).toBe(1);
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().misses).toBe(1);
  });

  it("supports tag invalidation and bounded LRU", async () => {
    const cache = createResponseCache({ maxEntries: 2 });
    await cache.getOrSet("a", "1", 1000, async () => 1, ["memory"]);
    await cache.getOrSet("b", "2", 1000, async () => 2, ["graph"]);
    await cache.getOrSet("c", "3", 1000, async () => 3, ["memory"]);

    expect(cache.stats().entries).toBe(2);
    expect(cache.invalidateTag("memory")).toBe(1);
    expect(cache.stats().entries).toBe(1);
  });

  it("reports performance budget failures", () => {
    const status = performanceBudgetStatus([
      { route: "/api/cache/stats", p95Ms: 20, budgetMs: 50 },
      { route: "/api/memory/search", p95Ms: 400, budgetMs: 250 },
    ]);

    expect(status.ok).toBe(false);
    expect(status.routes[1].status).toBe("fail");
  });
});
