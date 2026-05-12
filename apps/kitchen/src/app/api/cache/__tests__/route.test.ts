// @vitest-environment node
import { describe, expect, it } from "vitest";

const statsRoute = await import("../stats/route");
const purgeRoute = await import("../purge/route");
const prewarmRoute = await import("../prewarm/route");

describe("cache operations API", () => {
  it("exposes stats, prewarm, and purge controls", async () => {
    const prewarm = await prewarmRoute.POST();
    expect(prewarm.status).toBe(200);
    const prewarmData = await prewarm.json();
    expect(prewarmData.ok).toBe(true);

    const stats = await statsRoute.GET();
    const statsData = await stats.json();
    expect(statsData.stats.entries).toBeGreaterThan(0);
    expect(statsData.performance.ok).toBe(true);

    const purge = await purgeRoute.POST(new Request("http://localhost/api/cache/purge", { method: "POST" }) as any);
    const purgeData = await purge.json();
    expect(purgeData.ok).toBe(true);
    expect(purgeData.purged).toBeGreaterThan(0);
  });
});
