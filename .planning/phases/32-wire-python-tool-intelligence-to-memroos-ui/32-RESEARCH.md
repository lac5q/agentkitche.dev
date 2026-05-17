# Phase 32: Wire Python Tool Intelligence to Memroos UI - Research

**Researched:** 2026-05-03
**Domain:** TypeScript/Next.js port of an existing Python intelligence layer (no new external libraries)
**Confidence:** HIGH

## Summary

Phase 30 (Python) shipped three tool-intelligence features in `services/knowledge-mcp/knowledge_system/tool_attention.py`: per-capability `outcomeSummary` (uses/successes/failures/score/contextSignals), outcome-score-ranked `discover()` with task-context boosting, and `similarTaskRecommendations` derived from outcome metadata. Phase 31 (TypeScript) shipped a Memroos UI layer in `apps/memroos/src/lib/tool-attention.ts` that re-implemented capability assembly independently — it reads the same `tool-catalog.json` and `tool-attention-outcomes.jsonl` files but never ports the enrichment, ranking, or recommendation logic.

The audit's claims are verified file-by-file: `getToolAttention()` calls `readOutcomes()` only for aggregate trends (lines 95-108, 342-373); `matchesQuery()`/`matchesFilters()` (lines 272-302) do pure text/field matching with no scoring; `ToolAttentionCapability` (types/index.ts:166-177) has no `outcomeSummary` field; `ToolAttentionResponse.similarTaskRecommendations` (types/index.ts:262) is typed but never populated; `useToolAttention(query, filters)` (api-client.ts:248) accepts no context params; `/api/tool-attention/route.ts` reads no `task_type`/`repo`/`agent_id`/`tags` query params; only one UI consumer of the panel exists (`tool-attention-panel.tsx` in cookbooks) plus a flow node-detail consumer that uses only aggregate trends.

**Primary recommendation:** Port the Python enrichment functions (`_outcome_summaries`, `_with_outcome_signal`, `_context_match_signal`, `_build_similar_task_recommendations`, plus `discover()`'s scoring) directly into `lib/tool-attention.ts` — same JSONL file, same algorithm, same field shapes. Do NOT call out to Python over HTTP/MCP; both stacks already read the same files via env-var-overridable paths. This keeps the Memroos UI a single in-process Next.js read with no new runtime dependency.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read outcomes JSONL | Frontend Server (Next.js API) | — | Already done in `readOutcomes()`; same file as Python |
| Compute `outcomeSummary` per capability | Frontend Server (lib/tool-attention.ts) | — | Pure function over already-loaded outcomes; no DB |
| Outcome-score ranking in discover | Frontend Server (lib/tool-attention.ts) | — | Replaces/augments existing `matchesQuery` in `getToolAttention()` |
| Build `similarTaskRecommendations` | Frontend Server (lib/tool-attention.ts) | — | Pure function over enriched capabilities + task context |
| Accept context params (`task_type`, `repo`, `agent_id`, `tags`) | API Route (`/api/tool-attention`) | useToolAttention hook | Hook serializes to query params; route parses |
| Render outcomeSummary per capability | Browser (CapabilityRow, NodeDetailPanel) | — | New presentational columns/badges |
| Render similarTaskRecommendations | Browser (ToolAttentionPanel side panel) | NodeDetailPanel | New panel section parallel to "Recommended Loads" |

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase (no `/gsd-discuss-phase` was run). Constraints derive from the audit:

### Locked (from audit + REQUIREMENTS.md MEMGW-01..03)
- **Do not expose private task text in UI** — only aggregate metadata (`task_type`, `repo`, `agent_id`, `tags`, counts) leaves the API. Python already redacts via `_extract_context_from_outcome` reading only `metadata` dict, never `task` field. TypeScript port must do the same.
- **Same algorithm as Python** — the audit explicitly frames this as "wire Python intelligence to Memroos UI." Port the algorithm verbatim so future Python and TypeScript outputs stay shape-compatible.
- **Read same files as Python** — both stacks must read `tool-attention-outcomes.jsonl` from the same env-var-overridable path (`TOOL_ATTENTION_OUTCOMES`). No HTTP call to Python.
- **No execSync/exec** (from STATE.md decisions): use `fs/promises` only.

### Claude's Discretion
- Whether to merge the new `similarTaskRecommendations` into the existing `recommendations` block in the UI, or render as a separate sidebar section. Recommend separate, parallel to "Recommended Loads," shown only when context params present.
- Whether to expose the per-capability `outcomeSummary` as a compact badge (uses/score) on `CapabilityRow` or as an expandable details row. Recommend compact badge + full breakdown in a tooltip/popover.
- Whether the Flow `NodeDetailPanel` for `tool-gateway` should also call `useToolAttention(undefined, ...)` with task context, or remain context-free (current behavior). Recommend context-free for now — task context comes from cookbooks search, not flow inspection.

### Deferred (out of scope for Phase 32)
- TOOLGW-03 (unavailable-candidate classification) — Phase 33
- OPSGW-01/02/03 (lint debt, NFT warning, CI for MCP gateway) — Phase 33
- Surfacing `outcomesByTool` from Python `stats()` as a separate API — already partially covered by per-capability `outcomeSummary`; not required by MEMGW-01..03.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEMGW-01 | Per-capability outcome summaries surfaced in Memroos UI | Port Python `_outcome_summaries` + `_with_outcome_signal`; add `outcomeSummary` field to `ToolAttentionCapability`; render in `CapabilityRow` and Flow `NodeDetailPanel` |
| MEMGW-02 | Outcome-score ranking in tool_discover, surfaced in Memroos UI | Port Python `discover()` scoring (query_score×10 + outcome.score + context_score×3) into `getToolAttention()`; replace insertion-order with score-sorted output |
| MEMGW-03 | "Similar task used these tools" recommendations in Memroos UI | Port Python `_context_match_signal` + `_build_similar_task_recommendations`; add context params to hook + API route; populate `similarTaskRecommendations` (already typed); render in `ToolAttentionPanel` |

## Standard Stack

No new libraries. Existing stack only.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | (already installed) | API route + server-side fs reads | Already used by `/api/tool-attention/route.ts` `[VERIFIED: route.ts]` |
| `fs` (Node built-in) | — | Reading JSONL outcomes | Already used by `readOutcomes()` `[VERIFIED: tool-attention.ts:95]` |
| `@tanstack/react-query` | (already installed) | `useToolAttention` hook | Already used in `api-client.ts:255` `[VERIFIED]` |
| Vitest | (already installed) | Unit tests for new functions | Already used in `lib/__tests__/tool-attention.test.ts` `[VERIFIED]` |

**No installation needed.** All work is pure TypeScript additions to existing files.

## Architecture Patterns

### System Architecture Diagram

```
                         [Browser]
                           │
                           │ user types task context (task_type, repo, agent_id, tags)
                           ▼
                  ┌──────────────────────────────────┐
                  │ useToolAttention(query,          │
                  │   filters, taskContext)          │  ← NEW signature param
                  └────────────┬─────────────────────┘
                               │ serializes to query string:
                               │   ?q=...&task_type=...&repo=...&agent_id=...&tags=a,b
                               ▼
                  ┌──────────────────────────────────┐
                  │ GET /api/tool-attention/route.ts │
                  │   parses task_type/repo/agent_id │  ← NEW param parsing
                  │   /tags from searchParams         │
                  └────────────┬─────────────────────┘
                               │ getToolAttention(query, limit, filters, taskContext)
                               ▼
                  ┌──────────────────────────────────────────────────────┐
                  │ lib/tool-attention.ts :: getToolAttention()          │
                  │                                                       │
                  │  1. Assemble capabilities (existing)                  │
                  │  2. readOutcomes(outcomesPath)  (existing)            │
                  │  3. NEW: outcomeSummaries = computeOutcomeSummaries() │
                  │  4. NEW: enrich capabilities with outcomeSummary      │
                  │  5. apply filters (existing)                          │
                  │  6. NEW: rank by score(query, outcome, context)       │
                  │  7. NEW: build similarTaskRecommendations             │
                  └────────────┬─────────────────────────────────────────┘
                               │ ToolAttentionResponse with new fields
                               ▼
                  ┌──────────────────────────────────────────────────────┐
                  │ ToolAttentionPanel + Flow NodeDetailPanel             │
                  │  - CapabilityRow shows outcomeSummary badge           │
                  │  - New side section: "Similar Task Used These"        │
                  └──────────────────────────────────────────────────────┘

  [Filesystem]
    services/knowledge-mcp/tool-catalog.json     (read by both stacks)
    logs/tool-attention-outcomes.jsonl           (read by both stacks)
```

### Component Responsibilities

| File | New Responsibility |
|------|----|
| `apps/memroos/src/types/index.ts` | Add `outcomeSummary`, `contextSignals` to `ToolAttentionCapability`; add `taskContext` field to `ToolAttentionResponse`; remove optional `?` from `similarTaskRecommendations` (now always set, possibly empty) |
| `apps/memroos/src/lib/tool-attention.ts` | Add `computeOutcomeSummaries`, `enrichWithOutcomeSummary`, `contextMatchSignal`, `buildSimilarTaskRecommendations`, `scoreCapability` (port from Python). Modify `getToolAttention` signature to accept `taskContext`. Sort capabilities by score. Set `similarTaskRecommendations` and `taskContext` on response. |
| `apps/memroos/src/app/api/tool-attention/route.ts` | Parse `task_type`, `repo`, `agent_id`, `tags` (comma-separated) from `searchParams`; pass as `taskContext` arg |
| `apps/memroos/src/lib/api-client.ts` | Add 4 optional context args to `useToolAttention(query, filters, taskContext)`; serialize each into query string; include in `queryKey` |
| `apps/memroos/src/components/cookbooks/tool-attention-panel.tsx` | Add task-context input controls (4 inputs or one combined panel); show outcome summary badge on each `CapabilityRow`; new sidebar section rendering `similarTaskRecommendations` when present |
| `apps/memroos/src/components/flow/node-detail-panel.tsx` | Optional: surface top-3 capabilities by `outcomeSummary.score` in tool-gateway node panel |

### Pattern 1: Direct Algorithm Port (Python → TypeScript)

**What:** Mirror Python function signatures and behavior verbatim in TypeScript. Same constants, same scoring weights.
**When to use:** Both stacks must produce equivalent intelligence from the same data files.
**Example:**
```typescript
// Source: services/knowledge-mcp/knowledge_system/tool_attention.py:147-191
// Port to apps/memroos/src/lib/tool-attention.ts

interface ContextSignals {
  taskTypes: Record<string, number>;
  repos: Record<string, number>;
  agents: Record<string, number>;
  tags: Record<string, number>;
}

interface OutcomeSummary {
  toolId: string;
  uses: number;
  successes: number;
  failures: number;
  lastOutcome: string;
  lastUsedAt: string;
  score: number;
  contextSignals: ContextSignals;
}

function computeOutcomeSummaries(outcomes: ToolAttentionOutcome[]): Map<string, OutcomeSummary> {
  const summaries = new Map<string, OutcomeSummary>();
  for (const outcome of outcomes) {
    const toolId = String(outcome.toolId ?? "");
    if (!toolId) continue;
    const ctx = extractContextFromOutcome(outcome);
    const label = String(outcome.outcome ?? "").trim().toLowerCase();
    let s = summaries.get(toolId);
    if (!s) {
      s = { toolId, uses: 0, successes: 0, failures: 0, lastOutcome: "", lastUsedAt: "",
            score: 0, contextSignals: { taskTypes: {}, repos: {}, agents: {}, tags: {} } };
      summaries.set(toolId, s);
    }
    s.uses += 1;
    if (SUCCESS_OUTCOMES.has(label)) { s.successes += 1; s.score += 2; }
    else if (FAILURE_OUTCOMES.has(label)) { s.failures += 1; s.score -= 2; }
    else { s.score += 1; }
    if (!s.lastUsedAt) {
      s.lastUsedAt = String(outcome.timestamp ?? "");
      s.lastOutcome = String(outcome.outcome ?? "");
    }
    addCount(s.contextSignals.taskTypes, ctx.task_type);
    addCount(s.contextSignals.repos, ctx.repo);
    addCount(s.contextSignals.agents, ctx.agent_id);
    for (const tag of ctx.tags) addCount(s.contextSignals.tags, tag);
  }
  return summaries;
}
```

### Pattern 2: Score-Then-Sort Replaces Filter-Then-Slice

**What:** Replace `allCapabilities.filter(matchesQuery).filter(matchesFilters).slice(0,limit)` with `allCapabilities.filter(matchesFilters).map(scoreCapability).filter(s>0||noQuery).sort(byScore).slice(0,limit)`.
**When to use:** Phase 32 only — applies to `getToolAttention()`.
**Example:** See Python `discover()` lines 513-549 for exact formula. `query_score * 10 + outcome.score + context_score * 3`. With no query, sort by `outcome.score + context_score*3`.

### Anti-Patterns to Avoid
- **Calling Python over HTTP/MCP:** Existing `tool-attention.ts` already reads the JSONL directly. Adding an HTTP hop introduces latency, deployment coupling, and would conflict with `dynamic = "force-dynamic"` route's expectation of single-process reads.
- **Diverging from Python algorithm:** Constants (`SUCCESS_OUTCOMES`, `FAILURE_OUTCOMES`, weight `2`/`-2`/`1`, multipliers `10`/`3`) must match Python verbatim. The TypeScript copy of `SUCCESS_OUTCOMES`/`FAILURE_OUTCOMES` already exists at `tool-attention.ts:17-18` and matches Python.
- **Exposing `outcome.task` field to UI:** Python's `_extract_context_from_outcome` deliberately reads only `metadata`. TypeScript port must do the same. The `task` field stays server-side only.
- **Making `similarTaskRecommendations` optional in the response:** Currently `similarTaskRecommendations?:` is optional and never populated, which is why no UI renders it. Make it required (empty array when no context provided) so UI render logic is uniform.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONL parsing | Custom streaming parser | Existing `readOutcomes()` (line 95) which does `split("\n").filter(Boolean).map(JSON.parse)` | Already works for the trailing-N-lines pattern Python uses |
| Path redaction | New regex | Existing `publicPath`, `publicSource`, `publicCapability`, `publicLoadCommand` (lines 32-80) | Already mirror Python's `_public_path`/`_public_source` |
| Catalog assembly | New scanner | Existing `mcpCapabilities`, `knowledgeCapabilities`, `skillCapabilities` (lines 114-239) | Already in place; port only adds enrichment after assembly |
| Outcome aggregation algorithm | New scoring formula | Port verbatim from Python `_outcome_summaries`, `_context_match_signal`, `_build_similar_task_recommendations` | Behavioral parity is the explicit phase goal |
| Tag normalization | New parser | Port from Python `_as_tag_list` (handles list-or-csv-string, lowercases, strips empties) | Edge cases already covered |

**Key insight:** This phase is a port, not a design exercise. The Python file is the spec. Every deviation is a future bug.

## Runtime State Inventory

This phase modifies code only. No data migration needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `tool-attention-outcomes.jsonl` schema unchanged; new TypeScript code reads existing fields | None |
| Live service config | None — no MCP server config changes; no environment flag changes | None |
| OS-registered state | None | None |
| Secrets/env vars | `TOOL_ATTENTION_OUTCOMES`, `TOOL_ATTENTION_CATALOG`, `MEMROOS_ROOT`, `SKILLS_PATH`, `HOME` — all already consumed by both stacks; no new env vars introduced | None |
| Build artifacts | Next.js `.next` build cache will rebuild on first `npm run build`; no stale package metadata | Standard `npm run build` after merge |

## Common Pitfalls

### Pitfall 1: Reading more than 20 outcome lines
**What goes wrong:** Python defaults `_read_jsonl(limit=20)` for `recentOutcomes` shown in UI but iterates ALL lines for outcome aggregation (via `outcomesByTool` in `stats()`). Wait — actually re-checking: Python `build_catalog` calls `_read_jsonl(outcomes_path())` with default `limit=20`, then computes `_outcome_summaries(outcomes)` over those 20 only. So Python ALSO uses last-20. The TypeScript port must use the same window.
**Why it happens:** Misreading the Python — easy to assume "stats" reads everything.
**How to avoid:** Use existing `readOutcomes(filePath, 20)` for both `recentOutcomes` and outcome summary computation. Same data, single read.
**Warning signs:** TypeScript scores diverge from Python scores in tests with >20 outcomes.

### Pitfall 2: Capabilities filtered out before enrichment
**What goes wrong:** If you put `enrichWithOutcomeSummary` AFTER `filter(matchesQuery)`, capabilities with low text-match but high outcome score will be dropped before scoring sees them.
**Why it happens:** Phase 31 wrote `filter().filter().slice()` pipeline assuming filters were the only ranking signal.
**How to avoid:** Order is: assemble → enrich (add outcomeSummary to ALL) → filter by `matchesFilters` only (type/status/source/availability — these are user-explicit) → score (which incorporates query, outcome, context) → sort → slice. The query becomes part of scoring, not a hard filter — matching Python `discover()` (line 535: `if score(item) > 0` keeps anything with any signal).
**Warning signs:** Test where outcome-heavy capability is excluded by an unrelated query word.

### Pitfall 3: Empty taskContext zeroes out recommendations
**What goes wrong:** Python `_build_similar_task_recommendations` returns `[]` when no context provided (`if not any(task_context.values())`). The UI must not show "no recommendations" in that case — it should hide the section entirely.
**Why it happens:** Empty array is the correct Python behavior, but UI interpretation matters.
**How to avoid:** In `ToolAttentionPanel`, render the `similarTaskRecommendations` section only when at least one taskContext input is filled; otherwise hide entirely. (Render the existing static `recommendations` always.)
**Warning signs:** "No similar tasks found" message appears for users who never entered context.

### Pitfall 4: Comma-separated tags vs array
**What goes wrong:** API route receives `tags` as a single string from query params; Python `_as_tag_list` handles both list and CSV. TypeScript port must too.
**Why it happens:** URLSearchParams returns string, not array.
**How to avoid:** Port `_as_tag_list` exactly: split on comma, trim, lowercase, drop empties.
**Warning signs:** Tags like `tags=foo,bar` produce a single tag `"foo,bar"` instead of two.

### Pitfall 5: React Query cache key explosion
**What goes wrong:** `queryKey` for `useToolAttention` already contains 6 entries; adding 4 context fields gives 10. Each unique combination caches separately.
**Why it happens:** Cache invalidation is per-key.
**How to avoid:** Acceptable — cookbooks page typically has stable context. Document in plan that context inputs should debounce (e.g., 300 ms) before triggering refetch. React Query already does request dedup so simultaneous identical fetches collapse.
**Warning signs:** N+1 fetches as user types in context fields.

## Code Examples

Verified patterns from existing code (HIGH confidence — read from current files):

### Existing readOutcomes pattern to reuse
```typescript
// Source: apps/memroos/src/lib/tool-attention.ts:95-108
function readOutcomes(filePath: string, limit = 20): ToolAttentionOutcome[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf-8")
      .split("\n").filter(Boolean).slice(-limit)
      .map((line) => JSON.parse(line) as ToolAttentionOutcome).reverse();
  } catch { return []; }
}
```

### Python target algorithm to port (discover scoring)
```python
# Source: services/knowledge-mcp/knowledge_system/tool_attention.py:519-543
def score(item):
    haystack = " ".join([item.get("id",""), item.get("name",""), item.get("description",""),
                         item.get("source",""), " ".join(item.get("tags",[])), " ".join(item.get("useWhen",[]))]).lower()
    query_score = sum(1 for term in normalized.split() if term in haystack)
    outcome = item.get("outcomeSummary") if isinstance(item.get("outcomeSummary"), dict) else {}
    context_score, _ = _context_match_signal(outcome, normalized_context)
    return query_score * 10 + int(outcome.get("score", 0)) + context_score * 3
```

### Python similar-task builder to port
```python
# Source: services/knowledge-mcp/knowledge_system/tool_attention.py:466-492
def _build_similar_task_recommendations(capabilities, task_context, limit=5):
    recommendations = []
    if not any(task_context.values()):
        return recommendations
    for capability in capabilities:
        outcome_summary = capability.get("outcomeSummary")
        if not isinstance(outcome_summary, dict): continue
        context_score, reasons = _context_match_signal(outcome_summary, task_context)
        if context_score <= 0: continue
        recommendations.append({
            "capabilityId": capability.get("id", ""),
            "title": capability.get("name", ""),
            "score": context_score,
            "reason": f"Matched prior outcome context via {', '.join(reasons)}.",
        })
    recommendations.sort(key=lambda item: int(item.get("score", 0)), reverse=True)
    return recommendations[: max(1, min(limit, 10))]
```

### Hook signature change pattern
```typescript
// Source: apps/memroos/src/lib/api-client.ts:248-261 (current); modified target:
export interface ToolAttentionTaskContext {
  task_type?: string;
  repo?: string;
  agent_id?: string;
  tags?: string[];  // serialized as csv
}

export function useToolAttention(
  query?: string,
  filters?: ToolAttentionFilters,
  taskContext?: ToolAttentionTaskContext,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  // ... existing filter params ...
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Two stacks reading same files, different intelligence layers | One algorithm, ported to both languages | Phase 32 (this) | UI surfaces parity with Python tool_discover |
| `similarTaskRecommendations` typed, never set | Required field, set with empty array when no context | Phase 32 (this) | UI can rely on field being present |
| `useToolAttention(query, filters)` | `useToolAttention(query, filters, taskContext)` | Phase 32 (this) | Backward-compatible — third arg optional |

**Deprecated/outdated:** None. The current code is correct as far as it goes; this phase only adds.

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Next.js variant warning:** AGENTS.md says "This is NOT the Next.js you know." Read `node_modules/next/dist/docs/` before writing route or API code. The existing `route.ts` uses `export const dynamic = "force-dynamic"` and `NextRequest.nextUrl.searchParams` — keep this pattern.
- **GitNexus impact analysis:** Before editing `getToolAttention`, `useToolAttention`, the route handler, or the panel component, run `gitnexus_impact({target: "<symbol>", direction: "upstream"})` and report blast radius. After edits, run `gitnexus_detect_changes()` to verify scope.
- **No `execSync`/`exec`** (STATE.md): Use only `fs` (sync existing pattern) or `fs/promises`.
- **Refactor protocol:** No symbol renames in this phase — purely additive. If a rename becomes necessary (e.g., to clarify a function), use `gitnexus_rename({dry_run: true})` first.
- **Re-index after commit:** PostToolUse hook runs `npx gitnexus analyze` automatically after `git commit`; preserve embeddings if `.gitnexus/meta.json` shows `stats.embeddings > 0` by passing `--embeddings`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + Next.js dev server | All Memroos work | ✓ (assumed — already running prod on :3002) | per `apps/memroos/package.json` | — |
| Vitest | Unit tests | ✓ (existing test files use it) | per workspace lockfile | — |
| `tool-attention-outcomes.jsonl` | Realistic E2E test | ✗ (file does not currently exist at default path) | — | Tests already use `vi.stubEnv("TOOL_ATTENTION_OUTCOMES", tmpPath)` and write fixture JSONL — pattern works regardless |
| Python venv | Cross-checking parity behavior (optional) | ✓ (Phase 30 SUMMARY shows it works) | `~/github/knowledge/.venv` | Skip parity cross-check; rely on direct algorithm read |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** Outcomes log file — tests stub it, so phase work is unblocked. Production behavior with empty file is already handled by `readOutcomes`.

## Validation Architecture

`workflow.nyquist_validation` not set → treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (per `apps/memroos/src/lib/__tests__/tool-attention.test.ts` `// @vitest-environment node` directive) |
| Config file | `apps/memroos/vitest.config.*` (assumed; existing tests run via `npm --prefix apps/memroos run test`) |
| Quick run command | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts` |
| Full suite command | `npm --prefix apps/memroos run test && npm --prefix apps/memroos run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEMGW-01 | Each capability returned has `outcomeSummary` when outcomes recorded for it | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "outcomeSummary"` | ✅ extend existing |
| MEMGW-01 | UI renders outcome badge on `CapabilityRow` when `outcomeSummary` present | component | `npm --prefix apps/memroos run test -- src/components/cookbooks/__tests__/tool-attention-panel.test.tsx -t "outcome"` | ✅ extend existing |
| MEMGW-02 | Capabilities returned are sorted by score (query×10 + outcome.score + context×3) | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "ranks"` | ✅ extend existing |
| MEMGW-02 | API route returns same ordering when called with `?q=...` | route | `npm --prefix apps/memroos run test -- src/app/api/tool-attention/__tests__/route.test.ts -t "ranking"` | ✅ extend existing |
| MEMGW-03 | `similarTaskRecommendations` populated when context params provided | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "similarTask"` | ✅ extend existing |
| MEMGW-03 | API route accepts `task_type`, `repo`, `agent_id`, `tags` query params | route | `npm --prefix apps/memroos run test -- src/app/api/tool-attention/__tests__/route.test.ts -t "task_type"` | ✅ extend existing |
| MEMGW-03 | Response never contains private `task` field text from outcomes | unit (security) | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "redacts task"` | ❌ Wave 0 — add |
| MEMGW-03 | UI renders "Similar Task" section only when context provided | component | `npm --prefix apps/memroos run test -- src/components/cookbooks/__tests__/tool-attention-panel.test.tsx -t "similar"` | ❌ Wave 0 — add |

### Sampling Rate
- **Per task commit:** `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts src/app/api/tool-attention/__tests__/route.test.ts src/components/cookbooks/__tests__/tool-attention-panel.test.tsx`
- **Per wave merge:** `npm --prefix apps/memroos run test`
- **Phase gate:** `npm --prefix apps/memroos run test && npm --prefix apps/memroos run build` — both green; verify Turbopack NFT warning unchanged (it's pre-existing, deferred to Phase 33).

### Wave 0 Gaps
- [ ] Add a security test: assert response payload never contains the literal `task` field text from JSONL fixtures (defense against future regressions exposing private text)
- [ ] Add a component test: `tool-attention-panel.test.tsx` cases for outcome badges and similar-task section (currently tests only stat cards/filters)

## Security Domain

`security_enforcement` not set → enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | This is an internal Next.js route on :3002, no auth layer at app level |
| V3 Session Management | no | Same — no sessions |
| V4 Access Control | no | Same |
| V5 Input Validation | yes | URL params (`task_type`, `repo`, `agent_id`, `tags`, `q`, `limit`) must be normalized: trim, lowercase, length-cap. Reuse Python `_normalize_task_context` shape exactly. Reject `limit > 100` (Python clamps via `max(1, min(limit, 100))`). |
| V6 Cryptography | no | No crypto in this phase |

### Known Threat Patterns for Next.js + filesystem

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `TOOL_ATTENTION_OUTCOMES` env override | Tampering | Env var only, not user input — already constrained |
| Information disclosure: leaking absolute paths | Information Disclosure | Existing `publicPath`, `publicSource`, `publicCapability` redaction — verified by `tool-attention.test.ts` line 71 (`expect(payload).not.toContain(tempRoot)`). Extend the same assertion to cover new `outcomeSummary` and `similarTaskRecommendations` payload sections. |
| Information disclosure: leaking private `task` text from JSONL | Information Disclosure | Python deliberately reads only `metadata` dict; TypeScript port must do the same. Add explicit test: outcome with `task: "SECRET-INTERNAL-X"` must not appear anywhere in API response. |
| Query param injection (logging/log forging) | Tampering | Lowercase + length-cap context strings before they enter response payload (e.g., 64 chars) |
| Resource exhaustion via large `tags` list | DoS | Cap tags array at 16 entries after split |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest config exists at `apps/memroos/vitest.config.*` | Validation Architecture | LOW — existing tests already run via `npm test`; if config missing, plan should add Wave 0 task |
| A2 | `useToolAttention` callers (cookbooks page, flow node detail panel) tolerate adding a 3rd optional argument without changes | Component Responsibilities | LOW — TypeScript optional args are backward-compatible by default |
| A3 | Production server on :3002 is the only consumer of `/api/tool-attention` route | Standard Stack | LOW — STATE.md confirms; if external MCP consumers exist, they'd hit Python directly anyway |

**Note:** All algorithm details, file paths, function signatures, and existing code patterns are `[VERIFIED]` from direct file reads in this session. The Python algorithm description is taken verbatim from `tool_attention.py` lines cited above.

## Open Questions (RESOLVED)

1. **Should the cookbooks page expose a UI for entering task context, or should context come automatically from the cookbook being viewed?**
   - What we know: `tool-attention-panel.tsx` is rendered standalone in `cookbooks/page.tsx`; no per-cookbook association currently
   - What's unclear: UX direction — explicit form fields vs auto-derived from cookbook
   - RESOLVED: For Phase 32, ship explicit collapsible "Task Context" form (4 inputs). Auto-derivation can be a follow-up. Implemented in Plan 04.

2. **Should the Flow Tool Gateway node panel also expose context inputs?**
   - What we know: It currently calls `useToolAttention()` with no args
   - What's unclear: Whether flow inspection benefits from context filtering
   - RESOLVED: No — keep flow node panel context-free in Phase 32. Add note for future work. Confirmed in Plan 04.

3. **Should `outcomeSummary.contextSignals` be returned in the API response or computed server-side only?**
   - What we know: Python returns it as part of capability payload (it's in the dict that gets serialized)
   - What's unclear: Whether the UI needs to render breakdowns of why a tool is recommended
   - RESOLVED: Return it (parity with Python). UI can choose to render or ignore. Tag values are already lowercase + bounded. Implemented in Plan 02.

## Sources

### Primary (HIGH confidence — direct file reads in this session)
- `services/knowledge-mcp/knowledge_system/tool_attention.py` (full file, 597 lines)
- `apps/memroos/src/lib/tool-attention.ts` (full file, 434 lines)
- `apps/memroos/src/app/api/tool-attention/route.ts` (full file, 22 lines)
- `apps/memroos/src/types/index.ts` (lines 160-265)
- `apps/memroos/src/lib/api-client.ts` (lines 240-275)
- `apps/memroos/src/components/cookbooks/tool-attention-panel.tsx` (full, 275 lines)
- `apps/memroos/src/components/flow/node-detail-panel.tsx` (lines 1-120)
- `apps/memroos/src/lib/__tests__/tool-attention.test.ts` (test pattern reference)
- `.planning/v1.7-MILESTONE-AUDIT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/30-memory-aware-tool-selection/30-01-SUMMARY.md`
- `.planning/phases/30-memory-aware-tool-selection/30-02-SUMMARY.md`
- `.planning/phases/31-memroos-tool-gateway-operations-ui/31-01-SUMMARY.md`
- `CLAUDE.md`, `AGENTS.md`

### Secondary
- None — all claims verified against primary code/docs in repo

### Tertiary
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; everything already in package.json
- Architecture: HIGH — pattern is "port Python algorithm verbatim"; Python file is the spec
- Pitfalls: HIGH — every pitfall traces to a verified line in either the Python or TypeScript file
- Security: HIGH — existing redaction tests prove the pattern; new test asserts the same for new fields

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (30 days; both files are stable, intentional ports of one another)
