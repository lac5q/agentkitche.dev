# Phase 32: Wire Python Tool Intelligence to Memroos UI - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 9 (5 modified, 0 created — `route.test.ts` and `tool-attention-panel.test.tsx` already exist and are extended; `__tests__` dirs already exist)
**Analogs found:** 9 / 9

> All structural analogs live in the same files being modified (this is an additive port). The algorithmic analog is the Python `tool_attention.py` — every new function has an exact Python counterpart cited by line.

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `apps/memroos/src/lib/tool-attention.ts` | service (lib) | request-response (sync fs read → enrich → rank → return) | `services/knowledge-mcp/knowledge_system/tool_attention.py` (algorithmic), self (structural) | exact (same file, same algorithm) |
| `apps/memroos/src/types/index.ts` | model (type defs) | n/a | self lines 166–264 (existing `ToolAttentionCapability`/`ToolAttentionResponse`) | exact |
| `apps/memroos/src/app/api/tool-attention/route.ts` | route (Next.js API) | request-response | self (existing GET handler with `searchParams` parsing) | exact |
| `apps/memroos/src/lib/api-client.ts` | hook (react-query client) | request-response | self lines 248–261 (existing `useToolAttention`) | exact |
| `apps/memroos/src/hooks/useToolAttention.ts` | hook | — | NOT PRESENT — hook lives in `lib/api-client.ts`; do not create a separate file | n/a (RESEARCH.md item 5 was speculative — modify api-client.ts instead) |
| `apps/memroos/src/components/cookbooks/tool-attention-panel.tsx` | component (presentational + state) | event-driven (input → setState → refetch) | self (existing `ToolAttentionPanel`, `CapabilityRow`, `StatCard`) | exact |
| `apps/memroos/src/lib/__tests__/tool-attention.test.ts` | test (unit, vitest node env) | n/a | self (existing `redacts absolute local paths` test) | exact |
| `apps/memroos/src/app/api/tool-attention/__tests__/route.test.ts` | test (route, vitest with `vi.mock`) | n/a | self (existing `passes query and limit` test) | exact |
| `apps/memroos/src/components/cookbooks/__tests__/tool-attention-panel.test.tsx` | test (component, RTL) | n/a | self (existing `renders stats, capabilities` test) | exact |

## Pattern Assignments

### `apps/memroos/src/lib/tool-attention.ts` (service, request-response)

**Structural analog:** self. **Algorithmic analog:** `services/knowledge-mcp/knowledge_system/tool_attention.py`.

**Imports pattern** (lines 1–15) — keep as-is, add no new external deps:
```typescript
import fs from "fs";
import path from "path";
import { resolveFromRepoRoot } from "@/lib/paths";
import type {
  ToolAttentionCapability,
  ToolAttentionFilters,
  /* ... */
  ToolAttentionResponse,
} from "@/types";
```

**Outcome constants pattern** (lines 17–18) — already match Python verbatim, reuse:
```typescript
const SUCCESS_OUTCOMES = new Set(["helped", "success", "successful", "useful", "pass", "passed", "worked"]);
const FAILURE_OUTCOMES = new Set(["failed", "failure", "not_helpful", "not helpful", "miss", "error", "blocked"]);
```

**JSONL read pattern to reuse** (lines 95–108) — do NOT change:
```typescript
function readOutcomes(filePath: string, limit = 20): ToolAttentionOutcome[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as ToolAttentionOutcome)
      .reverse();
  } catch {
    return [];
  }
}
```

**Existing matchesQuery / matchesFilters pattern to extend, not replace** (lines 272–302):
```typescript
function matchesQuery(item: ToolAttentionCapability, query: string): boolean {
  if (!query.trim()) return true;
  const normalized = query.toLowerCase();
  return [item.id, item.name, item.type, item.source, item.description,
          item.tags.join(" "), item.useWhen.join(" ")]
    .some((value) => value.toLowerCase().includes(normalized));
}
```
→ Replace `.filter(matchesQuery).filter(matchesFilters).slice()` (line 405–408) with:
`.filter(matchesFilters).map(scoreCapability).filter(s>0||noQuery).sort(byScore).slice()`.

**NEW functions to port from Python** (cite exact Python lines):

| New TS function | Python source | Lines |
|---|---|---|
| `addCount(bucket, key)` | `_add_count` | 20–23 |
| `asTagList(value)` | `_as_tag_list` | 26–33 |
| `normalizeTaskContext(ctx)` | `_normalize_task_context` | 36–44 |
| `extractContextFromOutcome(outcome)` | `_extract_context_from_outcome` | 47–49 — **CRITICAL: only reads `metadata`, NEVER `outcome.task`** |
| `computeOutcomeSummaries(outcomes)` | `_outcome_summaries` | 147–191 |
| `enrichWithOutcomeSummary(caps, summaries)` | `_with_outcome_signal` | 194–205 |
| `contextMatchSignal(outcomeSummary, taskContext)` | `_context_match_signal` | 433–463 |
| `buildSimilarTaskRecommendations(caps, taskContext, limit=5)` | `_build_similar_task_recommendations` | 466–492 |
| `scoreCapability(item, normalizedQuery, normalizedContext)` | inline `score(item)` in `discover` | 519–533 |

**Scoring formula to copy verbatim** (Python tool_attention.py:519–533):
```python
query_score = sum(1 for term in normalized.split() if term in haystack)
return query_score * 10 + int(outcome.get("score", 0)) + context_score * 3
```
TypeScript port (constants `10`, `3`, `0` MUST match Python exactly):
```typescript
function scoreCapability(item: ToolAttentionCapability & { outcomeSummary?: OutcomeSummary },
                        normalizedQuery: string, normalizedContext: NormalizedTaskContext): number {
  const haystack = [item.id, item.name, item.description, item.source,
                    item.tags.join(" "), item.useWhen.join(" ")].join(" ").toLowerCase();
  const queryScore = normalizedQuery
    ? normalizedQuery.split(/\s+/).filter(Boolean).reduce((acc, term) => acc + (haystack.includes(term) ? 1 : 0), 0)
    : 0;
  const outcome = item.outcomeSummary;
  const [contextScore] = contextMatchSignal(outcome, normalizedContext);
  return queryScore * 10 + (outcome?.score ?? 0) + contextScore * 3;
}
```

**Modified `getToolAttention` signature** (line 385):
```typescript
// Before:
export function getToolAttention(query = "", limit = 25, filters?: ToolAttentionFilters): ToolAttentionResponse
// After (4th arg, optional, backward-compatible):
export function getToolAttention(
  query = "",
  limit = 25,
  filters?: ToolAttentionFilters,
  taskContext?: ToolAttentionTaskContext,
): ToolAttentionResponse
```

**Modified pipeline** (replaces lines 405–408) — order MUST be: assemble → enrich (all caps) → filter by filters → score → sort → slice:
```typescript
const normalizedContext = normalizeTaskContext(taskContext);
const summaries = computeOutcomeSummaries(outcomes);
const enriched = enrichWithOutcomeSummary(allCapabilities, summaries);
const filteredByFilters = enriched.filter((item) => matchesFilters(item, normalizedFilters));
const normalizedQuery = query.toLowerCase().trim();
const scored = filteredByFilters
  .map((item) => ({ item, score: scoreCapability(item, normalizedQuery, normalizedContext) }))
  .filter(({ score }) => !normalizedQuery || score > 0)
  .sort((a, b) => b.score - a.score)
  .map(({ item }) => item);
const capabilities = scored.slice(0, Math.max(1, Math.min(limit, 100)));
const similarTaskRecommendations = buildSimilarTaskRecommendations(scored, normalizedContext);
```

**Response field additions** — set `similarTaskRecommendations` and `taskContext` always (empty array when no context — matches Python line 545+548):
```typescript
return {
  /* ... existing fields ... */
  similarTaskRecommendations,         // always set, possibly []
  taskContext: normalizedContext,     // always set
  timestamp: now(),
};
```

**Path redaction (no change needed) — existing functions cover new fields**: `publicPath` (32–53), `publicSource` (55–60), `publicCapability` (62–67), `publicLoadCommand` (69–80). New `outcomeSummary` field has no paths; only string IDs and counts. `contextSignals` keys are lowercased+trimmed by `asTagList`/`normalizeTaskContext`.

---

### `apps/memroos/src/types/index.ts` (model)

**Existing types to extend** (lines 166–264). Additions only — no renames, no removals.

**Add new types** (port from Python `_outcome_summaries` shape, lines 147–191):
```typescript
export interface ToolAttentionContextSignals {
  taskTypes: Record<string, number>;
  repos: Record<string, number>;
  agents: Record<string, number>;
  tags: Record<string, number>;
}

export interface ToolAttentionOutcomeSummary {
  toolId: string;
  uses: number;
  successes: number;
  failures: number;
  lastOutcome: string;
  lastUsedAt: string;
  score: number;
  contextSignals: ToolAttentionContextSignals;
}

export interface ToolAttentionTaskContext {
  task_type?: string;
  repo?: string;
  agent_id?: string;
  tags?: string[];
}

export interface ToolAttentionNormalizedTaskContext {
  task_type: string;
  repo: string;
  agent_id: string;
  tags: string[];
}
```

**Extend existing `ToolAttentionCapability`** (line 166–177) with:
```typescript
export interface ToolAttentionCapability {
  /* ... existing fields ... */
  outcomeSummary?: ToolAttentionOutcomeSummary;   // NEW: present iff outcomes exist for this id
}
```

**Extend `ToolAttentionResponse`** (line 248–264) — make `similarTaskRecommendations` REQUIRED (always set, possibly empty), add `taskContext`:
```typescript
export interface ToolAttentionResponse {
  /* ... existing fields ... */
  similarTaskRecommendations: ToolAttentionRecommendation[];   // was optional, now required
  taskContext: ToolAttentionNormalizedTaskContext;             // NEW
  timestamp: string;
}
```

---

### `apps/memroos/src/app/api/tool-attention/route.ts` (route, request-response)

**Analog:** self (existing handler).

**Existing pattern** (lines 1–21) — keep `dynamic = "force-dynamic"`, `NextRequest.nextUrl.searchParams`:
```typescript
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "25");
  /* ... */
}
```

**Add context param parsing** (mirror existing `searchParams.get(...) ?? ""` pattern). Per RESEARCH.md security section, length-cap to 64 chars and tags array to 16 entries:
```typescript
const taskType = (request.nextUrl.searchParams.get("task_type") ?? "").slice(0, 64);
const repo = (request.nextUrl.searchParams.get("repo") ?? "").slice(0, 64);
const agentId = (request.nextUrl.searchParams.get("agent_id") ?? "").slice(0, 64);
const tagsRaw = request.nextUrl.searchParams.get("tags") ?? "";
const tags = tagsRaw
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean)
  .slice(0, 16);

return Response.json(
  getToolAttention(query, Number.isFinite(limit) ? limit : 25, { type, status, source, availability },
    { task_type: taskType, repo, agent_id: agentId, tags }),
);
```

---

### `apps/memroos/src/lib/api-client.ts` (hook, request-response)

**Analog:** self lines 248–261.

**Existing pattern** to mirror:
```typescript
export function useToolAttention(query?: string, filters?: ToolAttentionFilters) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filters?.type) params.set("type", filters.type);
  /* ... */
  return useQuery({
    queryKey: ["tool-attention", query, filters?.type ?? "", filters?.status ?? "",
               filters?.source ?? "", filters?.availability ?? "all"],
    queryFn: () => fetchJSON<ToolAttentionResponse>(`/api/tool-attention?${params}`),
    refetchInterval: 30000,
  });
}
```

**Modified signature** (3rd optional arg, backward-compatible — A2 from RESEARCH.md):
```typescript
import type { ToolAttentionTaskContext } from "@/types";

export function useToolAttention(
  query?: string,
  filters?: ToolAttentionFilters,
  taskContext?: ToolAttentionTaskContext,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.availability && filters.availability !== "all") params.set("availability", filters.availability);
  if (taskContext?.task_type) params.set("task_type", taskContext.task_type);
  if (taskContext?.repo) params.set("repo", taskContext.repo);
  if (taskContext?.agent_id) params.set("agent_id", taskContext.agent_id);
  if (taskContext?.tags?.length) params.set("tags", taskContext.tags.join(","));
  return useQuery({
    queryKey: ["tool-attention", query, filters?.type ?? "", filters?.status ?? "",
               filters?.source ?? "", filters?.availability ?? "all",
               taskContext?.task_type ?? "", taskContext?.repo ?? "",
               taskContext?.agent_id ?? "", (taskContext?.tags ?? []).join(",")],
    queryFn: () => fetchJSON<ToolAttentionResponse>(`/api/tool-attention?${params}`),
    refetchInterval: 30000,
  });
}
```

---

### `apps/memroos/src/components/cookbooks/tool-attention-panel.tsx` (component, event-driven)

**Analogs in same file:**
- `StatCard` (lines 15–29) — pattern for metric cards
- `CapabilityRow` (lines 31–62) — pattern for per-capability row, extend with outcome badge
- `useState` + `useToolAttention` wiring (lines 64–67) — extend with taskContext state
- "Recommended Loads" sidebar block (lines 184–199) — pattern for new "Similar Task" block

**Outcome badge — extend `CapabilityRow`** (insert into the description block at line 43):
```tsx
function CapabilityRow({ capability }: { capability: ToolAttentionCapability }) {
  const summary = capability.outcomeSummary;
  return (
    <div className="grid gap-3 border-b border-slate-800 py-3 last:border-0 md:grid-cols-[1fr_110px_110px_130px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-200">{capability.name}</p>
          {capability.topLevel && (/* existing top-level badge */)}
          {summary && (
            <span
              title={`uses=${summary.uses} successes=${summary.successes} failures=${summary.failures}`}
              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
            >
              score {summary.score} · {summary.uses}×
            </span>
          )}
        </div>
        {/* ...existing description... */}
      </div>
      {/* ...existing columns... */}
    </div>
  );
}
```

**Task context state — mirror existing `useState<ToolAttentionFilters>` pattern** (line 66):
```tsx
const [taskContext, setTaskContext] = useState<ToolAttentionTaskContext>({});
const { data, isLoading } = useToolAttention(query, filters, taskContext);
const hasContext = Boolean(
  taskContext.task_type || taskContext.repo || taskContext.agent_id || taskContext.tags?.length,
);
const similarTaskRecommendations = data?.similarTaskRecommendations ?? [];
```

**Task context inputs — mirror existing filter `<select>` row** (lines 123–167) but use `<Input>` (already imported, line 6) since values are free-text:
```tsx
<div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
  <Input aria-label="Task type" placeholder="task_type"
    value={taskContext.task_type ?? ""}
    onChange={(e) => setTaskContext((p) => ({ ...p, task_type: e.target.value }))} />
  <Input aria-label="Repo" placeholder="repo"
    value={taskContext.repo ?? ""}
    onChange={(e) => setTaskContext((p) => ({ ...p, repo: e.target.value }))} />
  <Input aria-label="Agent id" placeholder="agent_id"
    value={taskContext.agent_id ?? ""}
    onChange={(e) => setTaskContext((p) => ({ ...p, agent_id: e.target.value }))} />
  <Input aria-label="Tags (comma-separated)" placeholder="tags,csv"
    value={(taskContext.tags ?? []).join(",")}
    onChange={(e) => setTaskContext((p) => ({ ...p, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
</div>
```

**Similar Task sidebar — mirror "Recommended Loads" block** (lines 184–199), render ONLY when `hasContext` is true (Pitfall 3 from RESEARCH.md):
```tsx
{hasContext && (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Similar Task Used These</h3>
    {similarTaskRecommendations.length === 0 ? (
      <p className="mt-3 text-xs text-slate-500">No matches yet for this task context.</p>
    ) : (
      <div className="mt-3 space-y-3">
        {similarTaskRecommendations.map((item) => (
          <div key={item.capabilityId} className="rounded-lg bg-slate-950/60 p-3">
            <p className="text-sm font-semibold text-amber-400">{item.title}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-emerald-300">score {item.score}</p>
            <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

### `apps/memroos/src/lib/__tests__/tool-attention.test.ts` (test, vitest node env)

**Analog:** existing `redacts absolute local paths from the UI response` test (lines 19–86).

**Patterns to copy:**

1. **Per-test temp root + env stubs** (lines 21–66):
```typescript
tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tool-attention-"));
/* ...write fixtures... */
vi.stubEnv("MEMROOS_ROOT", tempRoot);
vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
vi.stubEnv("SKILLS_PATH", skillsPath);
```

2. **JSONL outcome fixture format** (line 60) — for new tests, add multiple lines and include `metadata` with `task_type`/`repo`/`agent_id`/`tags`:
```typescript
fs.writeFileSync(
  outcomesPath,
  [
    JSON.stringify({ timestamp: "2026-04-30T00:00:00Z", toolId: "external:router",
      task: "SECRET-INTERNAL-X", outcome: "helped",
      metadata: { task_type: "refactor", repo: "memroos", agent_id: "claude", tags: ["typescript","port"] } }),
    JSON.stringify({ timestamp: "2026-04-30T00:01:00Z", toolId: "external:router",
      task: "another secret", outcome: "failed",
      metadata: { task_type: "refactor" } }),
  ].join("\n"),
);
```

3. **Redaction assertion pattern** (line 71) — extend to assert `task` text never leaks:
```typescript
const data = getToolAttention("", 100, undefined, { task_type: "refactor" });
const payload = JSON.stringify(data);
expect(payload).not.toContain(tempRoot);
expect(payload).not.toContain("SECRET-INTERNAL-X");   // NEW: task text never leaves server
expect(payload).not.toContain("another secret");
```

4. **New test stubs needed (per VALIDATION.md):**
   - `it("attaches outcomeSummary to capabilities with recorded outcomes", ...)`
   - `it("ranks capabilities by query×10 + outcome.score + context×3", ...)`
   - `it("populates similarTaskRecommendations when context provided", ...)`
   - `it("returns empty similarTaskRecommendations when no context", ...)`
   - `it("redacts task field text from response", ...)` (Wave 0 gap)

---

### `apps/memroos/src/app/api/tool-attention/__tests__/route.test.ts` (test, route)

**Analog:** existing `passes query and limit to getToolAttention` test (lines 37–62).

**Patterns to copy:**

1. **vi.mock + dynamic import** (lines 5–35):
```typescript
vi.mock("@/lib/tool-attention", () => ({ getToolAttention: vi.fn(() => ({ /* fixture */ })) }));
const { GET } = await import("../route");
const { getToolAttention } = await import("@/lib/tool-attention");
```

2. **NextRequest construction with searchParams** (line 39):
```typescript
const req = new NextRequest("http://localhost/api/tool-attention?q=mcp&task_type=refactor&repo=memroos&agent_id=claude&tags=foo,bar");
await GET(req);
expect(getToolAttention).toHaveBeenCalledWith(
  "mcp", 25,
  expect.objectContaining({ type: "", status: "", source: "", availability: "all" }),
  { task_type: "refactor", repo: "memroos", agent_id: "claude", tags: ["foo", "bar"] },
);
```

3. **Mock fixture must include new required fields** (`similarTaskRecommendations: []`, `taskContext: { task_type: "", repo: "", agent_id: "", tags: [] }`) — TypeScript will fail if these are missing once `ToolAttentionResponse` is updated.

4. **New test stubs:**
   - `it("parses task_type/repo/agent_id/tags context params", ...)`
   - `it("splits tags csv into array and caps at 16 entries", ...)`
   - `it("ranking: forwards taskContext into getToolAttention", ...)`

---

### `apps/memroos/src/components/cookbooks/__tests__/tool-attention-panel.test.tsx` (test, RTL component)

**Analog:** existing `renders stats, capabilities, health, and recommendations` test (lines 105–128).

**Patterns to copy:**

1. **Mock useToolAttention** (lines 4–11):
```typescript
vi.mock("@/lib/api-client", () => ({ useToolAttention: vi.fn() }));
const mockUseToolAttention = vi.mocked(useToolAttention);
```

2. **Test data factory `makeData()`** (lines 13–95) — extend with `outcomeSummary` on at least one capability and a `similarTaskRecommendations` array:
```typescript
capabilities: [
  {
    id: "mcp-server:gitnexus", /* ...existing... */
    outcomeSummary: {
      toolId: "mcp-server:gitnexus",
      uses: 5, successes: 4, failures: 1,
      lastOutcome: "helped", lastUsedAt: "2026-04-30T00:00:00Z",
      score: 7,
      contextSignals: { taskTypes: { refactor: 3 }, repos: {}, agents: {}, tags: {} },
    },
  },
  /* ... */
],
similarTaskRecommendations: [
  { capabilityId: "mcp-server:gitnexus", title: "gitnexus", score: 6,
    reason: "Matched prior outcome context via task_type:refactor." },
],
taskContext: { task_type: "refactor", repo: "", agent_id: "", tags: [] },
```

3. **Render + query + fireEvent pattern** (lines 117–127):
```typescript
fireEvent.change(screen.getByLabelText("Task type"), { target: { value: "refactor" } });
expect(mockUseToolAttention).toHaveBeenLastCalledWith(
  "", expect.any(Object),
  expect.objectContaining({ task_type: "refactor" }),
);
```

4. **New test stubs (Wave 0):**
   - `it("renders outcome badge with score and uses count when outcomeSummary present", ...)`
   - `it("hides Similar Task section when no taskContext provided", ...)`
   - `it("renders Similar Task section when taskContext provided", ...)`
   - `it("forwards taskContext from inputs into useToolAttention", ...)`

---

## Shared Patterns

### Path / value redaction (apply to all output)

**Source:** `apps/memroos/src/lib/tool-attention.ts:32–80` — `publicPath`, `publicSource`, `publicCapability`, `publicLoadCommand`.
**Apply to:** All capabilities returned from `getToolAttention`. New `outcomeSummary` field requires NO new redaction (no paths inside) — but `contextSignals` keys MUST be lowercased + length-bounded via `asTagList`/`normalizeTaskContext` (port from Python `_as_tag_list` / `_normalize_task_context`).
**Critical:** `extractContextFromOutcome` reads ONLY `outcome.metadata`, NEVER `outcome.task` (Python tool_attention.py:47–49).

### Algorithmic parity with Python (apply to all new lib functions)

**Source:** `services/knowledge-mcp/knowledge_system/tool_attention.py`.
**Constants that MUST be identical:**
- `SUCCESS_OUTCOMES`, `FAILURE_OUTCOMES` sets — already in TypeScript at lines 17–18 ✅
- Outcome score weights: `+2` success, `-2` failure, `+1` neutral (Python lines 174–181)
- Discover formula multipliers: `query_score * 10 + outcome.score + context_score * 3` (Python line 533)
- Context signal weights: `task_type * 2`, `repo * 2`, `agent_id * 1`, `tag * 1` (Python lines 444–460)
- `readOutcomes(_, 20)` window — Python uses `_read_jsonl(_, limit=20)` everywhere; TypeScript already does this (Pitfall 1)
- Recommendation slice: `recs.slice(0, Math.max(1, Math.min(limit, 10)))` (Python line 492)
- Capability slice: `caps.slice(0, Math.max(1, Math.min(limit, 100)))` (Python line 546, TS line 408 ✅)

### React Query hook signature backward-compat

**Source:** `apps/memroos/src/lib/api-client.ts:248–261`.
**Apply to:** Adding optional 3rd `taskContext` arg keeps existing callers (`tool-attention-panel.tsx:67`, `node-detail-panel.tsx`) working unchanged. `queryKey` extension is additive.

### Vitest patterns

**Node-env tests (lib + route):** `// @vitest-environment node` directive + `vi.stubEnv` + `vi.mock("@/lib/tool-attention", ...)` + `await import("../route")` after mock setup.
**JSDOM-env tests (component):** Default env, `@testing-library/react` `render`/`screen`/`fireEvent`, `vi.mocked(useToolAttention).mockReturnValue({ data, isLoading: false })`.

## No Analog Found

None. Every file in scope has a strong structural analog (the file itself in 6 of 9 cases) AND an exact algorithmic analog in `tool_attention.py`.

## Metadata

**Analog search scope:**
- `apps/memroos/src/lib/tool-attention.ts` (full)
- `apps/memroos/src/types/index.ts` (lines 155–265)
- `apps/memroos/src/app/api/tool-attention/route.ts` (full)
- `apps/memroos/src/lib/api-client.ts` (lines 235–280)
- `apps/memroos/src/components/cookbooks/tool-attention-panel.tsx` (full)
- `apps/memroos/src/lib/__tests__/tool-attention.test.ts` (full)
- `apps/memroos/src/app/api/tool-attention/__tests__/route.test.ts` (full)
- `apps/memroos/src/components/cookbooks/__tests__/tool-attention-panel.test.tsx` (full)
- `services/knowledge-mcp/knowledge_system/tool_attention.py` (full, 597 lines)

**Files scanned:** 9 (all primary; no exploratory scans needed — RESEARCH.md was source-of-truth).

**Pattern extraction date:** 2026-05-03

**Discrepancy with RESEARCH.md item 5:** RESEARCH.md lists `apps/memroos/src/hooks/useToolAttention.ts` as a file to modify, but no such file exists. The hook lives in `apps/memroos/src/lib/api-client.ts` (line 248). Planner should treat item 5 as a duplicate of item 4 — modify `api-client.ts`, do not create a new `hooks/` file.
