---
phase: 32
slug: wire-python-tool-intelligence-to-memroos-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `32-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Node environment, per `// @vitest-environment node` in existing `apps/memroos/src/lib/__tests__/tool-attention.test.ts`) |
| **Config file** | `apps/memroos/vitest.config.*` (assumed; Wave 0 confirms or adds) |
| **Quick run command** | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts src/app/api/tool-attention/__tests__/route.test.ts src/components/cookbooks/__tests__/tool-attention-panel.test.tsx` |
| **Full suite command** | `npm --prefix apps/memroos run test && npm --prefix apps/memroos run build` |
| **Estimated runtime** | ~30 seconds (quick); ~120 seconds (full + build) |

---

## Sampling Rate

- **After every task commit:** Run quick run command above
- **After every plan wave:** Run `npm --prefix apps/memroos run test`
- **Before `/gsd-verify-work`:** Full suite must be green; Turbopack NFT warning must remain unchanged (pre-existing, deferred to Phase 33)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-W0a | 01 | 0 | infra | T-32-INFO-1 | Add private-`task` redaction security test stub | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "redacts task"` | ❌ W0 | ⬜ pending |
| 32-01-W0b | 01 | 0 | infra | — | Add component test stubs for outcome badge + similar-task panel | component | `npm --prefix apps/memroos run test -- src/components/cookbooks/__tests__/tool-attention-panel.test.tsx -t "outcome\|similar"` | ❌ W0 | ⬜ pending |
| 32-01-01 | 01 | 1 | MEMGW-01 | T-32-INFO-1 | Capability returns `outcomeSummary` when outcomes recorded; no private `task` text leaks | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "outcomeSummary"` | ✅ extend | ⬜ pending |
| 32-01-02 | 01 | 1 | MEMGW-02 | T-32-V5-1 | Capabilities sorted by combined score (query×10 + outcome.score + context×3) | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "ranks"` | ✅ extend | ⬜ pending |
| 32-01-03 | 01 | 1 | MEMGW-03 | T-32-INFO-1 | `similarTaskRecommendations` populated only when context provided; no `task` text exposure | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "similarTask"` | ✅ extend | ⬜ pending |
| 32-01-04 | 01 | 2 | MEMGW-02,03 | T-32-V5-1, T-32-DOS-1 | API route accepts/normalizes `task_type`,`repo`,`agent_id`,`tags`,`limit`; ranking preserved | route | `npm --prefix apps/memroos run test -- src/app/api/tool-attention/__tests__/route.test.ts -t "task_type\|ranking"` | ✅ extend | ⬜ pending |
| 32-01-05 | 01 | 2 | MEMGW-01,02,03 | — | `useToolAttention(query, filters, context)` accepts 3rd optional arg, callers unaffected | unit | `npm --prefix apps/memroos run test -- src/hooks` | ⚠️ verify | ⬜ pending |
| 32-01-06 | 01 | 3 | MEMGW-01 | — | `tool-attention-panel.tsx` renders outcome badge on capability rows when present | component | `npm --prefix apps/memroos run test -- src/components/cookbooks/__tests__/tool-attention-panel.test.tsx -t "outcome"` | ❌ W0 | ⬜ pending |
| 32-01-07 | 01 | 3 | MEMGW-03 | — | `tool-attention-panel.tsx` renders "Similar Task" section only when context provided | component | `npm --prefix apps/memroos run test -- src/components/cookbooks/__tests__/tool-attention-panel.test.tsx -t "similar"` | ❌ W0 | ⬜ pending |
| 32-01-08 | 01 | 3 | MEMGW-01,02,03 | T-32-INFO-2 | Full payload contains no `tempRoot` or absolute outcomes path; redaction unchanged | unit | `npm --prefix apps/memroos run test -- src/lib/__tests__/tool-attention.test.ts -t "redact"` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/memroos/src/lib/__tests__/tool-attention.test.ts` — add stubs for `outcomeSummary`, `ranks`, `similarTask`, `redacts task` test names
- [ ] `apps/memroos/src/app/api/tool-attention/__tests__/route.test.ts` — confirm exists; add stubs for `task_type` and `ranking` test names (create file if missing)
- [ ] `apps/memroos/src/components/cookbooks/__tests__/tool-attention-panel.test.tsx` — confirm exists; add stubs for `outcome` and `similar` test names (create file if missing)
- [ ] Verify `apps/memroos/vitest.config.*` exists; if not, install/configure before Wave 1

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual outcome-badge styling on cookbooks tool-attention-panel | MEMGW-01 | Component snapshot covers structure; visual regression is human judgment | Open `http://localhost:3002/cookbooks`, locate tool-attention-panel, confirm outcome badge renders with success/failure counts and is not visually overwhelming |
| Similar-Task collapsible form UX (cookbooks) | MEMGW-03 | UX flow (open/close, defaults, persistence) is judgment | Open cookbooks page, expand "Task Context" form, enter `task_type=feature`, `tags=ts,tooling`, confirm Similar Task section appears with at least one recommendation |
| Flow Tool Gateway node panel unchanged after hook signature change | MEMGW-01,02,03 | Existing UI must not regress | Open flow view, click a Tool Gateway node, confirm node-detail-panel still renders trends/loaded/skipped without errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (verified — every task above has an automated command)
- [ ] Wave 0 covers all MISSING references (4 items above)
- [ ] No watch-mode flags in test commands (verified — all use `run test --` non-watch)
- [ ] Feedback latency < 30s (verified — quick command targets only the three relevant test files)
- [ ] `nyquist_compliant: true` set in frontmatter (set by gsd-nyquist-auditor at end of phase)

**Approval:** pending
