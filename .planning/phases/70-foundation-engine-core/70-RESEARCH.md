# Phase 70: Foundation + Engine Core — Research

**Researched:** 2026-05-17
**Domain:** LangGraph orchestration (Python), TypeScript memory adapter interface, SQLite WAL
**Confidence:** HIGH — all key claims verified against source code in this repo

---

## Summary

Phase 70 is a three-track phase: (1) add edit-and-continue to a paused LangGraph HIL thread, (2) add multi-hop retry budgets and declarative rollback compensation to the orchestration engine, and (3) introduce a stable `MemoryAdapter` interface in TypeScript that Phase 71 depends on. Three ordering constraints are hard: WAL pragma must land first (concurrent edit+resume stalls without it), the `langgraph>=1.2,<2.0` pin must land before any `RetryPolicy` usage, and the `MemoryAdapter` interface must ship before Phase 71 begins.

The existing graph topology (`START → route_policy → [approval|dispatch] → END`) is a single-hop chain. Multi-hop is a topology expansion, not a parameter change — the planner must treat ORCH-08..10 as a significant graph rewrite. The HIL edit-and-continue path adds a new `PATCH /hil/{id}/edit` FastAPI endpoint that calls `graph.update_state(config, patch, as_node="route_policy")` — the `as_node` value is `"route_policy"` (not `"approval"`) because `approval`'s only successor is `END`, which would terminate the graph immediately. No new Python packages are required beyond the pin tightening.

**Primary recommendation:** Ship WAL pragma and langgraph pin first (prerequisite tasks), then build in parallel: HIL edit-and-continue, multi-hop compensation, and MemoryAdapter interface. All three can proceed simultaneously since they touch non-overlapping files.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIL-01 | Operator can modify declared task state fields via a dedicated edit UI before resuming a paused LangGraph thread | `update_state(config, patch, as_node="route_policy")` in `LangGraphRuntime`; new `PATCH /hil/{id}/edit` FastAPI endpoint; new TS client function `editOrchestrationHil()` |
| HIL-02 | System validates edited field values against `OrchestrationState` schema before accepting the update | Pydantic `HilEditRequest` model mirrors `OrchestrationState` fields; FastAPI returns 422 on unknown keys; unknown keys must be rejected before `update_state` call |
| HIL-03 | Audit log records who edited a HIL task, which fields changed, and before/after values | New `hop_type="state_edit"` row in `orchestration_lineage` carrying `detail_json` with `actor`, `before`, `after` keys; no new table needed |
| ORCH-08 | Each hop in a multi-agent chain has a configurable retry budget via LangGraph `RetryPolicy` | `RetryPolicy(max_attempts=N, retry_on=[Exception])` on `dispatch` node; per-hop retry counts stored in `orchestration_lineage.detail_json["attempts_per_hop"]` not in top-level `attempts` column |
| ORCH-09 | Each forward action declares a paired compensating action stored as a declarative row in `orchestration_lineage` | New `hop_type="compensation_pending"` row written at dispatch time with `detail_json["compensation_verb"]` and `detail_json["forward_hop_id"]`; updated to `"compensation_done"` or `"compensation_skipped"` at rollback time |
| ORCH-10 | A2A task status reflects granular failure state: "failed at hop N, compensated hops 1..N-1" | `orchestration_runs.status` updated to `"rolled_back"` with detail in lineage; new `rollback_reason TEXT` and `rolled_back_at TEXT` columns on `orchestration_runs` (additive ALTER TABLE migration) |
| MEM-06 | `MemoryAdapter` interface exposes only `search()`, `write()`, and `health()` — no client handle leakage | New `apps/memroos/src/lib/memory/adapter.ts` with TypeScript interface; no method returns a Qdrant/Neo4j client type; enforced at the TS interface level |
| MEM-07 | Adapter registry maps `MemoryTier` to `MemoryAdapter[]`; new backends register without touching existing code | New `apps/memroos/src/lib/memory/registry.ts`; registry is a `Map<MemoryTier, MemoryAdapter[]>`; existing callers updated to call registry lookup instead of concrete functions |
| MEM-08 | Existing mem0/Qdrant/Neo4j backends wrapped as concrete adapters implementing the interface | Three concrete adapters (one per tier) in `backends.ts` or new sibling files; existing `searchVectorMemory`, `queryGraphMemory`, and `recallByKeyword` become adapter implementations |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

These are binding — research does not recommend approaches that contradict them.

- **No `execSync`/`exec`** in TypeScript. Use `execFileSync` with an explicit argv array. In Python: `subprocess.run([...], shell=False)`.
- **Two-DB boundary is inviolable**: `orchestration.db` (Python service) and `memroos.db` (Next.js) are never opened from the other process. Cross-boundary data flows over HTTP only — never SQL JOIN across files.
- **WAL mode required on both SQLite files**: `memroos.db` already has WAL + `busy_timeout=5000` set in `lib/db.ts`. `orchestration.db` has neither (confirmed: `OrchestrationStore.__init__` calls `executescript` with no PRAGMA — see `services/orchestration/engine.py`). WAL must be added as the first task.
- **`authorizeRegistryWrite` guard required on all new `/api/orchestration/` routes.** Pattern is established in `apps/memroos/src/app/api/orchestration/hil/route.ts`.
- **mem0 write path is HTTP-only**: never call `agent_memory` Qdrant directly. The adapter interface must not expose a Qdrant client handle.
- **AGENTS.md**: read `node_modules/next/dist/docs/` before writing any Next.js code. This project may use APIs that differ from training data.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WAL pragma + busy_timeout on orchestration.db | Python orchestration service | — | `OrchestrationStore.__init__` owns the SQLite connection; pragma must be set before first `_init_schema()` call |
| `langgraph` version pin | Python orchestration service (requirements.txt) | — | `RetryPolicy` and `TimeoutPolicy` require LangGraph >= 1.2 |
| HIL edit endpoint (`PATCH /hil/{id}/edit`) | Python orchestration service (FastAPI) | — | `graph.update_state()` must be called from the same process that holds the `SqliteSaver` checkpointer |
| HIL edit audit logging | Python orchestration service (`orchestration_lineage`) | — | Lineage rows are written from the Python engine; `orchestration.db` is the audit store for orchestration events |
| HIL edit TS client + route (`PATCH /api/orchestration/hil/{id}/edit`) | Next.js API tier | Python service (upstream) | Next.js proxies the edit to the Python service; operator auth guard here |
| Multi-hop graph topology expansion | Python orchestration service (`graph.py`) | — | LangGraph graph owns routing/retry/compensation logic |
| Compensating action rows in `orchestration_lineage` | Python orchestration service | — | Compensation is Python-side; remote agents receive a standard A2A task with `requiredCapability: "compensate"` — no remote rollback dependency |
| `orchestration_runs` schema migration (additive columns) | Python orchestration service (`engine.py`) | — | `OrchestrationStore._init_schema()` owns DDL; `ALTER TABLE IF NOT EXISTS` pattern |
| `MemoryAdapter` interface + registry | Next.js (TypeScript) | — | Callers are Next.js API routes; adapter wraps HTTP calls to Python mem0 service |
| Concrete adapter implementations (mem0, Neo4j, episodic) | Next.js (TypeScript) | — | Wraps existing `searchVectorMemory`, `queryGraphMemory`, `recallByKeyword` |

---

## Standard Stack

### Core (no new installs — pin tightening only)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `langgraph` | `>=1.2,<2.0` | LangGraph graph runtime, `RetryPolicy`, `update_state` | Pin tightening only — currently unpinned in `requirements.txt` |
| `langgraph-checkpoint-sqlite` | current | `SqliteSaver` checkpointer | Already in `requirements.txt` |
| `fastapi` | current | Orchestration HTTP API | Already in `requirements.txt` |
| TypeScript (Next.js app) | current | TS adapter interface | No new packages |

**No net-new Python packages** for Phase 70. The `>=1.2,<2.0` constraint gives access to `RetryPolicy`, `TimeoutPolicy`, `error_handler` on nodes (all added in LangGraph 1.2).

[ASSUMED] LangGraph 1.2.0 is available on PyPI with `RetryPolicy` — this was cited in `.planning/research/STACK.md` and consistent with training knowledge, but `pip index versions langgraph` was not run in this session.

### Installation (prerequisite task only)

```bash
# In services/orchestration/requirements.txt — change the existing line:
# FROM:  langgraph
# TO:    langgraph>=1.2,<2.0
```

---

## Package Legitimacy Audit

> No net-new packages in Phase 70. The only change is a pin tightening on `langgraph` (already installed and in `requirements.txt`).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `langgraph` | PyPI | Existing (already installed) | High | github.com/langchain-ai/langgraph | N/A — existing dep | Already approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Operator Browser
       |
       | PATCH /api/orchestration/hil/{id}/edit   (new — TS route)
       |
Next.js API Layer  ─── authorizeRegistryWrite ───► 403 if unauthorized
       |
       | PATCH /hil/{id}/edit  (new — proxied to Python service)
       |
Python FastAPI Orchestration Service
       |
       ├── validate patch against HilEditRequest (Pydantic)
       |         |
       |         └── 422 if unknown keys
       |
       ├── graph.update_state(config, patch, as_node="route_policy")
       |         |
       |         └── SqliteSaver writes new checkpoint to orchestration.db
       |
       ├── store.append_lineage(hop_type="state_edit", detail={actor, before, after})
       |
       └── 200 {ok: true, editedFields: [...]}

Later: Operator calls POST /hil/{id}/resolve {"decision": "approve"}
       |
       └── LangGraphRuntime.resume(run_id, "approve")
                 |
                 └── graph.invoke(Command(resume="approve"), config)
                           |
                           └── Resumes from last checkpoint → route_policy conditional → dispatch → END
```

**Multi-hop retry/rollback flow (new topology):**

```
START → route_policy → [needs_approval] → approval (HIL interrupt) → END
                   └──────────────────► dispatch_hop_N
                                              |
                                         [RetryPolicy: max_attempts=N]
                                              |
                                    ┌── success → next_hop / END
                                    └── exhausted → rollback_compensation
                                                         |
                                                   [per-hop in reverse order]
                                                   compensation_pending → compensation_done|skipped
                                                         |
                                                   orchestration_runs.status = "rolled_back"
```

### Recommended File Changes

```
services/orchestration/
├── engine.py          # MODIFIED: WAL pragma + busy_timeout in __init__; additive ALTER TABLE migration
├── graph.py           # MODIFIED: add RetryPolicy on dispatch node; add rollback_compensation node; expand OrchestrationState TypedDict
├── app.py             # MODIFIED: add PATCH /hil/{id}/edit endpoint; add HilEditRequest Pydantic model
└── requirements.txt   # MODIFIED: pin langgraph>=1.2,<2.0

apps/memroos/src/lib/memory/
├── adapter.ts         # NEW: MemoryAdapter interface + MemorySearchResult type
├── registry.ts        # NEW: adapter registry (Map<MemoryTier, MemoryAdapter[]>)
└── backends.ts        # MODIFIED: existing functions wrapped as concrete adapters

apps/memroos/src/app/api/orchestration/hil/
└── [id]/
    ├── route.ts       # EXISTING (POST /resolve)
    └── edit/
        └── route.ts   # NEW: PATCH /hil/{id}/edit — proxies to Python service
```

### Pattern 1: WAL + Busy Timeout (FIRST task — prerequisite for everything else)

```python
# Source: services/orchestration/engine.py — OrchestrationStore.__init__
# Add BEFORE self._init_schema() call:
def __init__(self, db_path: str):
    self.db_path = db_path
    parent = os.path.dirname(db_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    self.conn = sqlite3.connect(db_path)
    self.conn.row_factory = sqlite3.Row
    # WAL mode required: concurrent edit+resume would stall under rollback journal
    self.conn.execute("PRAGMA journal_mode=WAL")
    self.conn.execute("PRAGMA busy_timeout=5000")
    self._init_schema()
```

**Why before `_init_schema()`:** `executescript()` commits any pending transaction. Setting the pragma before schema creation ensures WAL is active from the first write.

### Pattern 2: HIL Edit — `as_node="route_policy"` Is the Correct Value

**Critical topology fact** (verified against `services/orchestration/graph.py` edge declarations):

```
START → route_policy
route_policy →[needs_approval conditional]→ "approval" or "dispatch"
approval → END          ← as_node="approval" here terminates graph immediately
dispatch → END
```

The `approval` node's only successor is `END`. If `as_node="approval"` were used in `update_state`, the next execution would call the `approval` node's successor (which is `END`) and the graph would terminate without dispatching.

`as_node="route_policy"` marks the update as if `route_policy` produced it, which re-enters the `needs_approval` conditional edge and routes to `dispatch` (since after the operator edit, `requiresApproval` may now be `False`).

```python
# Source: services/orchestration/graph.py — new method in LangGraphRuntime
def edit_and_checkpoint(self, run_id: str, patch: dict) -> dict:
    """Write a state patch to the checkpoint without resuming.
    Caller must invoke resume() separately to continue execution."""
    config = {"configurable": {"thread_id": run_id}}
    with self._compiled() as graph:
        current = graph.get_state(config)
        before = {k: current.values.get(k) for k in patch}
        # as_node="route_policy" ensures resume re-enters the dispatch routing conditional
        graph.update_state(config, patch, as_node="route_policy")
    return {"before": before, "after": patch}
```

### Pattern 3: `orchestration_lineage` Compensation Schema

No new table or columns on `orchestration_lineage` are needed. New `hop_type` values are sufficient:

| `hop_type` | When Written | Required `detail_json` Keys |
|------------|-------------|----------------------------|
| `compensation_pending` | At dispatch time (paired with the forward dispatch) | `forward_hop_id` (lineage row id of the paired forward dispatch), `compensation_verb` ("undo", "rollback", "cancel"), `agent_id` |
| `rollback_started` | When retry budget exhausted and compensation begins | `hops_to_compensate: [N, N-1, ...]`, `trigger: "retry_exhausted"` |
| `compensation_done` | Compensation A2A task acknowledged | `forward_hop_id`, `confirmed_at` |
| `compensation_skipped` | Agent does not implement compensation | `forward_hop_id`, `reason: "agent_no_compensate_capability"` |
| `rollback_complete` | All compensation rows resolved | `final_status: "rolled_back"` |

**Additive columns on `orchestration_runs`** (ALTER TABLE migration in `_init_schema`):
- `rollback_reason TEXT` — human-readable summary of why rollback was triggered
- `rolled_back_at TEXT` — ISO timestamp

These columns use `ALTER TABLE IF NOT EXISTS` applied after the `CREATE TABLE IF NOT EXISTS` block, so they are skipped on fresh installs (CREATE TABLE handles them) and added safely on existing DBs.

### Pattern 4: `OrchestrationState` TypedDict Additions

```python
# Source: services/orchestration/graph.py — expand existing TypedDict
class OrchestrationState(TypedDict, total=False):
    # Existing fields (Phase 36):
    runId: str
    taskSummary: str
    requiredCapability: str
    selectedAgentId: Optional[str]
    requiresApproval: bool
    status: str
    approvalDecision: str
    # New fields (Phase 70 — ORCH-08..10):
    hops: List[Dict[str, Any]]          # per-hop dispatch records [{agent_id, hop_id, attempts, ...}]
    currentHopIndex: int                # 0-based index into hops list
    rollbackPolicy: str                 # "compensate_and_fail" | "fail_fast" | "ignore"
    rollbackReason: Optional[str]       # set by rollback_compensation node
```

### Pattern 5: `MemoryAdapter` TypeScript Interface

```typescript
// Source: apps/memroos/src/lib/memory/adapter.ts — NEW FILE
// Constraint: no method returns a Qdrant/Neo4j client type (MEM-P1)
// Constraint: adapter declares owned tiers to prevent double-writes (MEM-P2)

import type { MemoryTier } from "./tiers";
import type { MemoryTierHealth } from "./backends";

export interface MemorySearchResult {
  id: string | number;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryAdapter {
  /** Which tier(s) this adapter owns. An active adapter claiming a tier disables the built-in path. */
  readonly tiers: MemoryTier[];
  /** Query the backend for relevant memories. */
  search(query: string, limit: number): Promise<MemorySearchResult[]>;
  /** Write a memory entry to the backend. */
  write(payload: Record<string, unknown>): Promise<void>;
  /** Return health status without exposing internal client handles. */
  health(): Promise<MemoryTierHealth>;
}
```

**Adapter registry pattern** (`lib/memory/registry.ts`):

```typescript
// Source: apps/memroos/src/lib/memory/registry.ts — NEW FILE
import type { MemoryTier } from "./tiers";
import type { MemoryAdapter } from "./adapter";

const _registry = new Map<MemoryTier, MemoryAdapter[]>();

export function registerAdapter(adapter: MemoryAdapter): void {
  for (const tier of adapter.tiers) {
    const existing = _registry.get(tier) ?? [];
    _registry.set(tier, [...existing, adapter]);
  }
}

export function getAdapters(tier: MemoryTier): MemoryAdapter[] {
  return _registry.get(tier) ?? [];
}

export function clearRegistry(): void {
  _registry.clear();
}
```

**Registration in `backends.ts`** — the three existing functions become concrete adapter implementations registered at module init. Existing callers at `app/api/memory/multi-search/route.ts`, `app/api/memory/search/route.ts`, `app/api/memory/graph/route.ts`, and `lib/memory-recall-evals.ts` continue to call the same-named functions as shims (functions remain but delegate to the adapter), OR callers are updated to use `getAdapters("vector")[0].search(query, limit)`. The shim approach is lower risk — leave existing function signatures intact, implement them to call the registered adapter internally.

### Anti-Patterns to Avoid

- **`as_node="approval"` in `update_state`**: approval's successor is `END`. The graph terminates immediately after the update instead of dispatching. [VERIFIED from `graph.py` edge map]
- **Storing compensation logic as Python callables (lambda/functools.partial)**: Process restart destroys in-memory closures. All compensation instructions must be rows in `orchestration_lineage`. [ORCH-P1]
- **Assuming remote A2A agents implement rollback**: A2A v1 has no rollback verb. Compensation is Memroos-side. Remote agents receive a standard task with `requiredCapability: "compensate"` — if absent, record `compensation_skipped` and continue. [ORCH-P2]
- **Per-query embedding of all candidates**: Not a Phase 70 concern, but do not pre-optimize the adapter's `search()` to call embeddings. The adapter wraps existing HTTP calls — embedding is Phase 71.
- **Exposing a Qdrant/Neo4j client handle from `MemoryAdapter`**: Violates the mem0 HTTP-only invariant and MEM-P1.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph state persistence and replay | Custom SQLite checkpoint table | `SqliteSaver` from `langgraph-checkpoint-sqlite` | Already integrated; supports `get_state_history()` for rewind |
| Per-node retry with backoff | Custom retry decorator | `RetryPolicy(max_attempts=N, retry_on=[...])` from `langgraph>=1.2` | Built into node registration |
| Concurrent write protection for checkpointer | asyncio Semaphore on every call site | Serialize edit+resume at the HTTP route layer: accept `PATCH /hil/{id}/edit` only when `status == "waiting_for_approval"` | Status CAS is sufficient given per-thread semantics; adds HIL-P2 protection without complex locking |

---

## Common Pitfalls

### Pitfall 1: Wrong `as_node` terminates graph on resume (HIL-P1)

**What goes wrong:** `graph.update_state(config, patch, as_node="approval")` causes the graph to resume AT approval's successor, which is `END`. The task is marked done without dispatching.

**Why it happens:** `as_node` selects which node's outgoing edges determine the next step. The `approval` node has edge `approval → END`. Using `as_node="approval"` means the next step is `END`.

**How to avoid:** Always use `as_node="route_policy"` for task payload edits. This re-enters the `needs_approval` conditional and routes to `dispatch` when `requiresApproval=False` in the patched state.

**Warning signs:** `status="approved"` appears in the lineage immediately after the edit call with no `dispatch_request` hop following it.

### Pitfall 2: `OrchestrationStore` is per-request, not a singleton (CC-2)

**What goes wrong:** `app.py:get_engine()` creates a new `sqlite3.connect()` and closes it in `finally` for every HTTP request. Any phase-70 code that stores retry counters, compensation callbacks, or in-flight state as Python instance variables will lose that state on the next request.

**Why it happens:** Architectural choice from Phase 36 to avoid connection pool complexity.

**How to avoid:** All per-hop retry counts, compensation status, and rollback state must be rows in `orchestration_lineage` and `orchestration_runs`. Never in Python memory.

### Pitfall 3: Compensation fan-out per-hop count stored in wrong column (ORCH-P3)

**What goes wrong:** `orchestration_runs.attempts` is a single integer. For multi-hop, incrementing it for Hop 2 failures makes it impossible to know which hop exhausted its budget.

**How to avoid:** Store per-hop retry counts in `orchestration_lineage.detail_json["attempts_per_hop"]` keyed by lineage row id. The `attempts` column on `orchestration_runs` tracks total top-level attempts, not per-hop.

### Pitfall 4: Double-writer per memory tier (MEM-P2)

**What goes wrong:** If a concrete adapter is registered for `"vector"` but `searchVectorMemory()` continues to be called directly, both paths write/read concurrently.

**How to avoid:** Existing function shims must delegate to the registered adapter. If no adapter is registered for a tier, shim falls back to direct call. Document the fallback contract explicitly.

### Pitfall 5: Missing `authorizeRegistryWrite` on new TS route (CC-5)

**What goes wrong:** New `PATCH /api/orchestration/hil/{id}/edit` route omits the auth guard, creating an open unauthenticated endpoint reachable through the Cloudflare tunnel.

**How to avoid:** Copy the exact guard pattern from `apps/memroos/src/app/api/orchestration/hil/route.ts` — both `authorizeRegistryWrite(request)` check and `registryWriteUnauthorizedResponse()` return.

---

## Runtime State Inventory

> Phase 70 is not a rename/refactor/migration phase. However: the `orchestration_lineage` schema gains new `hop_type` values and `orchestration_runs` gains additive columns. These are forward-only migrations using `ALTER TABLE IF NOT EXISTS` — no data migration required. Existing `hop_type` string values are unaffected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `orchestration_lineage` rows with existing hop_types (ingress, route, dispatch_request, hil_wait, hil_approved, hil_rejected, dispatch_failure, retry_scheduled, retry_exhausted) | None — new hop_types are additive |
| Stored data | `orchestration_runs` table — missing `rollback_reason` and `rolled_back_at` columns | ALTER TABLE migration in `_init_schema` (additive) |
| Live service config | orchestration FastAPI service at `localhost:3210` | Restart after requirements.txt pin change |
| OS-registered state | None — Python service runs via uvicorn, no OS registration | None |
| Secrets/env vars | `ORCHESTRATION_DB_PATH`, `ORCHESTRATION_RETRY_LIMIT`, `ORCHESTRATION_SERVICE_URL` — no renames | None |
| Build artifacts | None relevant | None |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3 | orchestration service | Yes | 3.14.2 | — |
| pytest | Python tests | Yes (check `pip show pytest`) | check at task time | — |
| vitest | TypeScript tests | Yes | configured in `apps/memroos/vitest.config.ts` | — |
| langgraph >= 1.2 | RetryPolicy, update_state | Unknown — currently unpinned | verify via `pip show langgraph` | N/A — must be pinned before any ORCH-08 work |
| SQLite WAL | orchestration.db | Not yet enabled | N/A (no PRAGMA set) | Must add — no fallback |

**Missing dependencies with no fallback:**
- WAL pragma on `orchestration.db`: must be added as first task before any concurrent HIL work begins.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Python framework | `unittest` (used in existing orchestration tests) |
| Python config | None — `python -m unittest` from `services/orchestration/` |
| Python quick run | `python -m pytest services/orchestration/tests/ -x` |
| Python full suite | `python -m pytest services/orchestration/tests/` |
| TypeScript framework | Vitest |
| TypeScript config | `apps/memroos/vitest.config.ts` |
| TypeScript quick run | `cd apps/memroos && npx vitest run src/lib/memory` |
| TypeScript full suite | `cd apps/memroos && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIL-01 | `PATCH /hil/{id}/edit` updates checkpoint state; resume dispatches | Integration (Python) | `python -m pytest services/orchestration/tests/test_graph_runtime.py -k edit -x` | ❌ Wave 0 |
| HIL-02 | Unknown keys in edit payload return 422 | Unit (Python) | `python -m pytest services/orchestration/tests/test_app.py -k edit_validation -x` | ❌ Wave 0 |
| HIL-03 | Lineage row with `hop_type="state_edit"` and before/after in detail_json | Unit (Python) | `python -m pytest services/orchestration/tests/test_engine.py -k state_edit_audit -x` | ❌ Wave 0 |
| ORCH-08 | `dispatch` node retries up to `max_attempts` before exhausting | Unit (Python) | `python -m pytest services/orchestration/tests/test_graph_runtime.py -k retry_policy -x` | ❌ Wave 0 |
| ORCH-09 | `compensation_pending` row created at dispatch; updated to `done/skipped` on rollback | Unit (Python) | `python -m pytest services/orchestration/tests/test_engine.py -k compensation_row -x` | ❌ Wave 0 |
| ORCH-10 | `orchestration_runs.status = "rolled_back"` with non-null `rollback_reason` | Unit (Python) | `python -m pytest services/orchestration/tests/test_engine.py -k rolled_back_status -x` | ❌ Wave 0 |
| MEM-06 | `MemoryAdapter` interface has no `getClient()` or client-handle method | Type check (TS) | `cd apps/memroos && npx tsc --noEmit --project tsconfig.typecheck.json` | ❌ Wave 0 (interface file) |
| MEM-07 | `registerAdapter` and `getAdapters` work; new adapter added without touching backends.ts | Unit (TS) | `cd apps/memroos && npx vitest run src/lib/memory/__tests__/registry.test.ts` | ❌ Wave 0 |
| MEM-08 | Vector, graph, episodic concrete adapters pass `search`, `write`, `health` contracts | Unit (TS) | `cd apps/memroos && npx vitest run src/lib/memory/__tests__/adapters.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `python -m pytest services/orchestration/tests/ -x` (Python) OR `cd apps/memroos && npx vitest run src/lib/memory` (TS)
- **Per wave merge:** full suites: `python -m pytest services/orchestration/tests/` + `cd apps/memroos && npx vitest run`
- **Phase gate:** both full suites green before `/gsd:verify-work`

### Wave 0 Gaps (must be created before implementation begins)

- [ ] `services/orchestration/tests/test_graph_runtime.py` — extend with HIL edit + retry tests (file exists, add test methods)
- [ ] `services/orchestration/tests/test_engine.py` — extend with compensation row + rollback_status tests (file exists, add test methods)
- [ ] `services/orchestration/tests/test_app.py` — extend with edit endpoint validation tests (file exists, add test methods)
- [ ] `apps/memroos/src/lib/memory/__tests__/registry.test.ts` — new file for adapter registry
- [ ] `apps/memroos/src/lib/memory/__tests__/adapters.test.ts` — new file for concrete adapter contracts

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `authorizeRegistryWrite()` guard on all new `/api/orchestration/` routes |
| V3 Session Management | No | N/A — stateless token auth |
| V4 Access Control | Yes | Operator-only edit/resolve; auth guard on Python FastAPI (add `x-operator-token` header check mirroring the TS layer) |
| V5 Input Validation | Yes | Pydantic `HilEditRequest` model; reject unknown keys with 422; validate `as_node` is never caller-controlled |
| V6 Cryptography | No | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Operator injects arbitrary keys into `update_state` via edit payload | Tampering | Pydantic model on `HilEditRequest` matches `OrchestrationState` fields exactly; unknown keys rejected 422 before `update_state` call |
| Unauthenticated access to new edit endpoint through Cloudflare tunnel | Elevation of Privilege | `authorizeRegistryWrite` guard; mirror in Python FastAPI if service port is exposed |
| `as_node` parameter injected by caller to route graph to unintended node | Tampering | `as_node` value is hardcoded in server code, never taken from request body |

---

## Open Questions

1. **LangGraph 1.2 on Python 3.14**
   - What we know: Python 3.14.2 is installed; `langgraph` is unpinned; `RetryPolicy` requires >= 1.2
   - What's unclear: Whether the current installed version is already >= 1.2, or whether the pin upgrade may surface compatibility issues with Python 3.14 (an alpha/beta Python version)
   - Recommendation: First task should `pip install langgraph>=1.2,<2.0 --dry-run` to verify compatibility before changing `requirements.txt`

2. **A2A compensation capability convention**
   - What we know: A2A v1 has no rollback verb; compensation must be Memroos-side; remote agents receive a task with `requiredCapability: "compensate"`
   - What's unclear: Which existing agents (if any) implement a `compensate` capability? There are no multi-hop chains today, so this is greenfield.
   - Recommendation: Define the convention in Phase 70 as `requiredCapability: "compensate"` with `correlationId` back-reference; document `compensation_skipped` as the safe default for non-implementing agents.

3. **`recallByKeyword` adapter wrapper**
   - What we know: `recallByKeyword` in `lib/db-ingest.ts` is a synchronous function receiving a `Database` handle; it implements episodic search; the `MemoryAdapter.search()` interface is async
   - What's unclear: How to cleanly wrap the synchronous better-sqlite3 call in an async `MemoryAdapter.search()` — technically trivial (`return Promise.resolve(recallByKeyword(...))`) but requires the adapter to hold a `db` handle reference
   - Recommendation: The episodic adapter's constructor accepts a `() => Database` factory (uses existing `getDb()` singleton pattern). This is consistent with the CLAUDE.md constraint against exposing DB handles externally.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | LangGraph >= 1.2 is available on PyPI and compatible with Python 3.14 | Standard Stack | Phase 70 cannot proceed until pinned; `RetryPolicy` unavailable if version < 1.2 |
| A2 | LangGraph `update_state(config, patch, as_node="route_policy")` followed by `invoke(Command(resume=decision))` is the canonical edit-and-continue pattern | Architecture Patterns | If API changed in recent LangGraph, the resume call may not use the updated state; must verify against installed version docs |

---

## Sources

### Primary (HIGH confidence — verified against source code)

- `services/orchestration/graph.py` — graph topology (nodes, edges, `OrchestrationState` fields), confirmed `approval → END` edge, confirmed `as_node="route_policy"` is correct
- `services/orchestration/engine.py` — `OrchestrationStore.__init__` missing WAL pragma (confirmed), `orchestration_lineage` schema, `orchestration_runs` schema
- `services/orchestration/app.py` — existing FastAPI endpoints, `get_engine()` per-request pattern
- `services/orchestration/requirements.txt` — `langgraph` currently unpinned
- `apps/memroos/src/lib/memory/backends.ts` — existing `searchVectorMemory`, `queryGraphMemory`, `checkVectorHealth`, `checkGraphHealth` signatures
- `apps/memroos/src/lib/memory/tiers.ts` — `MemoryTier` type definition (`"vector" | "graph" | "episodic"`)
- `apps/memroos/src/lib/db.ts` — WAL pragma pattern (model for `orchestration.db` fix)
- `apps/memroos/src/lib/orchestration/client.ts` — `OrchestrationHilDecision` interface, `resolveOrchestrationHil` function signature
- `apps/memroos/src/app/api/recall/route.ts` — `recallByKeyword` call pattern (episodic adapter input)

### Secondary (MEDIUM confidence — cited from planning research)

- `.planning/research/ARCHITECTURE.md` — feature component classification, build-order analysis, two-DB boundary analysis
- `.planning/research/PITFALLS.md` — CC-2 through CC-5, HIL-P1 through MEM-P4
- `.planning/research/STACK.md` — LangGraph 1.2.0 `RetryPolicy` and `update_state` capabilities
- `.planning/research/SUMMARY.md` — phase grouping rationale and net-new package assessment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing `langgraph` pinning is low-risk
- Architecture: HIGH — all decisions derived from source code; `as_node` value verified against edge map
- Pitfalls: HIGH — lifted from verified research; CC and HIL-P pitfalls confirmed in source
- MemoryAdapter shape: HIGH — callers are all confirmed in source; interface shape is a direct fit
- LangGraph `RetryPolicy` availability: ASSUMED — dependency on version >= 1.2 which may or may not be installed

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (LangGraph moves fast; verify RetryPolicy API if > 30 days elapsed)
