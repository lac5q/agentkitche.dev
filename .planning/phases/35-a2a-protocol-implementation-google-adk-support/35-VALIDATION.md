---
phase: 35
slug: a2a-protocol-implementation-google-adk-support
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-05
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest for Memroos TypeScript/Next.js route/service/component tests; optional mocked Python/ADK fixture docs/tests if planner adds examples |
| **Config file** | `apps/memroos/vitest.config.ts` |
| **Quick run command** | `npm --prefix apps/memroos run test -- <changed test files>` |
| **Full suite command** | `npm --prefix apps/memroos run test -- <phase 35 test files> && npm --prefix apps/memroos run lint && npm --prefix apps/memroos run build` |
| **Estimated runtime** | ~15-45 seconds targeted; build may take longer |

---

## Sampling Rate

- **After every task commit:** Run targeted Vitest files for the touched A2A module/route/component.
- **After every plan wave:** Run all Phase 35 tests plus relevant Phase 34 registry compatibility tests.
- **Before `$gsd-verify-work`:** Targeted tests, lint, build, and static spec grep must be green.
- **Max feedback latency:** 60 seconds for targeted tests; build is allowed to exceed this.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | A2A-01, A2A-08 | T35-card-auth | Agent card declares enforced auth scheme and leaks no secrets | route/unit | `npm --prefix apps/memroos run test -- src/lib/a2a src/app/.well-known` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 2 | A2A-03, A2A-04, A2A-06 | T35-ssrf-registration | Card ingestion validates URL/card and writes only through canonical registry | service/route | `npm --prefix apps/memroos run test -- src/lib/a2a src/app/api/a2a` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 3 | A2A-02, A2A-07, A2A-08 | T35-task-auth | Task send/get/cancel/stream require authenticated caller and enforce task ownership | service/route | `npm --prefix apps/memroos run test -- src/lib/a2a src/app/message:send src/app/tasks` | ❌ W0 | ⬜ pending |
| 35-04-01 | 04 | 4 | A2A-04, A2A-05, A2A-06 | T35-delegation-lineage | Delegation uses registered A2A agents, preserves lineage, and surfaces ADK fixture in Flow | integration/component | `npm --prefix apps/memroos run test -- src/lib/a2a src/components/flow src/components/agents` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/memroos/src/lib/a2a/__tests__/agent-card.test.ts` — stubs for A2A-01/A2A-08.
- [ ] `apps/memroos/src/lib/a2a/__tests__/registration.test.ts` — stubs for A2A-03/A2A-04/A2A-06.
- [ ] `apps/memroos/src/lib/a2a/__tests__/task-store.test.ts` — stubs for A2A-02/A2A-07/A2A-08.
- [ ] `apps/memroos/src/app/**/__tests__/a2a-route.test.ts` or route-specific test files — stubs for send/stream/get/cancel auth and behavior.
- [ ] `apps/memroos/src/components/flow/__tests__/registry-flow-roster.test.tsx` extension or new ADK/A2A fixture test — verifies registered A2A/ADK agents surface in Flow.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real ADK runtime smoke test | A2A-06 | CI should not require a live Google ADK server or external model credentials | Start the optional ADK fixture or mock server, register its `agent-card.json`, confirm it appears in Registry/Flow, send a task, observe stream, fetch final task. |
| Multi-machine private-network smoke test | A2A-03/A2A-05/A2A-08 | Requires another host/Tailscale/LAN URL | Run mock/ADK A2A server on another machine or private URL, register card, send authenticated task, confirm unauthorized calls fail. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s for targeted tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
