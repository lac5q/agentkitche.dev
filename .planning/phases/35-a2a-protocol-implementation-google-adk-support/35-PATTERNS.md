# Phase 35 Pattern Map: A2A Protocol Implementation + Google ADK Support

**Created:** 2026-05-05
**Purpose:** Map Phase 35 planned files to existing Memroos analogs so executors preserve codebase style and avoid protocol/auth drift.

## Summary

Phase 35 should add a focused `apps/memroos/src/lib/a2a/*` module family and route handlers that reuse Phase 34 registry, DB, audit, dispatch, and UI patterns. Treat A2A as a standards adapter over the canonical registry and durable task state, not as a second registry or a rewrite of `/api/dispatch`.

## File Pattern Map

| New / Modified Area | Role | Closest Existing Analog | Pattern To Reuse |
|---------------------|------|-------------------------|------------------|
| `apps/memroos/src/lib/a2a/types.ts` | Spec-shaped A2A DTOs and task/card enums | `apps/memroos/src/types/index.ts`, `apps/memroos/src/lib/dispatch/types.ts` | Small explicit TypeScript interfaces; exported unions for statuses/protocol fields; no ambient globals |
| `apps/memroos/src/lib/a2a/config.ts` | Config-derived public base URL, well-known paths, network policy, timeouts | `apps/memroos/src/lib/paths.ts`, `apps/memroos/src/lib/constants.ts` | Centralize env reads; keep defaults local-dev friendly; never scatter `localhost` literals through routes |
| `apps/memroos/src/lib/a2a/agent-card.ts` | Memroos's own current A2A card builder | `apps/memroos/src/lib/dispatch/build-agent-card.ts` | Builder function returning serializable card object; replace stale `authentication: none` with declared bearer/API-key security |
| `apps/memroos/src/lib/a2a/card-ingestion.ts` | Fetch/validate remote agent cards and register canonical agents | `apps/memroos/src/lib/agent-registry.ts`, `apps/memroos/src/app/api/agents/register/route.ts` | Parse unknown input with small guards; normalize capabilities; call `registerAgent()` as mutation boundary |
| `apps/memroos/src/lib/a2a/task-store.ts` | SQLite task/event persistence | `apps/memroos/src/lib/agent-registry.ts`, `apps/memroos/src/lib/db-schema.ts` | Additive `CREATE TABLE IF NOT EXISTS`; service functions wrap DB SQL; JSON stored as text metadata |
| `apps/memroos/src/lib/a2a/task-service.ts` | Send/get/list/cancel/stream task lifecycle | `apps/memroos/src/app/api/dispatch/route.ts`, `apps/memroos/src/lib/audit.ts` | Validate body, content-scan messages, write audit events, persist correlation IDs before external work |
| `apps/memroos/src/lib/a2a/client.ts` | Outbound delegation to registered A2A agents | `apps/memroos/src/lib/dispatch/adapter-factory.ts`, `apps/memroos/src/lib/dispatch/openclaw-adapter.ts` | Adapter-style isolation; explicit timeout; return structured accepted/rejected evidence |
| `apps/memroos/src/app/.well-known/agent-card.json/route.ts` | Canonical public A2A card route | `apps/memroos/src/app/api/agents/[id]/card/route.ts` | `dynamic = "force-dynamic"`; Response.json; no secrets in response |
| `apps/memroos/src/app/.well-known/agent.json/route.ts` | Compatibility alias for roadmap/stale clients | `apps/memroos/src/app/api/agents/cards/route.ts` | Thin wrapper around canonical builder; document alias as compatibility-only |
| `apps/memroos/src/app/message:send/route.ts` and `apps/memroos/src/app/message:stream/route.ts` | A2A HTTP+JSON message routes | `apps/memroos/src/app/api/heartbeat/route.ts`, `apps/memroos/src/app/api/dispatch/route.ts` | `authenticateAgentHeaders()` first; reject missing/invalid auth; delegate to service; avoid echoing unsafe payloads |
| `apps/memroos/src/app/tasks/[id]/route.ts`, `apps/memroos/src/app/tasks/route.ts` | Task get/list routes | `apps/memroos/src/app/api/agents/route.ts`, `apps/memroos/src/app/api/activity/route.ts` | Read-only route pattern; authorization enforced by service; timestamped JSON responses |
| `apps/memroos/src/app/tasks/[id]:cancel/route.ts`, `apps/memroos/src/app/tasks/[id]:subscribe/route.ts` | Cancel and SSE subscribe routes | `apps/memroos/src/app/api/dispatch/route.ts` plus existing polling APIs | Service-owned state transitions; SSE only for A2A streams, not dashboard-wide architecture |
| `apps/memroos/src/components/agents/*` | A2A card registration and safe metadata display | `apps/memroos/src/components/agents/agent-registration-form.tsx`, `agent-registry-table.tsx`, `agent-registry-drawer.tsx` | Add compact fields/badges; dense metadata in drawer; do not expose stored secrets |
| `apps/memroos/src/components/flow/*` | A2A/ADK badges and task summary in Flow | `apps/memroos/src/components/flow/react-flow-canvas.tsx`, `node-detail-panel.tsx`, `registry-flow-roster.test.tsx` | Registry-driven roster only; no hardcoded ADK nodes; compact node data, richer drawer/panel detail |
| `examples/adk-a2a-agent/*` | Optional ADK-compatible proof fixture | `apps/memroos/src/lib/dispatch/__tests__/*`, route tests with mocked services | CI should use static/mocked fixture; real ADK runtime remains optional developer proof |

## Specific Code Patterns

### Route Handler Pattern

Existing API routes use `export const dynamic = "force-dynamic"`, parse `request.json().catch(() => null)`, validate unknown bodies with narrow guards, and return `Response.json` / `NextResponse.json` with `{ ok, error, code }` where useful. Phase 35 A2A routes should keep that shape while mapping protocol errors to spec-compatible status/error payloads.

### Registry Boundary Pattern

`registerAgent()` is the canonical mutation boundary. A2A card ingestion must call `registerAgent({ protocol: "a2a", platform, capabilities, metadata, issueApiKey })` rather than creating rows directly. Direct SQL belongs only in A2A task/event storage, not in registry mutation.

### Auth Pattern

`authenticateAgentHeaders(request.headers, agentIdHint?)` binds bearer/API-key auth to canonical agent identity. A2A routes must ignore body-provided caller identity unless it matches the authenticated agent. This preserves Phase 34's spoofing protection.

### DB Pattern

`db-schema.ts` owns additive migrations. Prefer new tables:
- `a2a_tasks`
- `a2a_task_events`

Use ISO timestamp text, JSON text payloads, indexes for task ID/context/status/caller/target, and no destructive migrations.

### UI Pattern

Registry and Flow are already canonical-roster driven. Phase 35 UI should add metadata display and registration affordances without adding a new design system or a parallel A2A-only roster.

## Landmines

- Current `build-agent-card.ts` returns `authentication.schemes: ["none"]`; do not reuse that field shape without checking the current A2A schema.
- The roadmap's `tasks/send` wording is stale. Use current spec-native routes/method names, with compatibility aliases only if cheap and clearly marked.
- Avoid hardcoded `localhost`, ports, ADK fixture URLs, or Luis-specific paths. Use A2A config seams from the start.
- Fetching arbitrary agent-card URLs is SSRF-prone. The ingestion service must block unsafe schemes and metadata IPs at minimum, and make private-network allowance an explicit policy.
- Do not turn `/api/dispatch` into A2A. Keep A2A task services separate, then bridge through adapters where useful.
