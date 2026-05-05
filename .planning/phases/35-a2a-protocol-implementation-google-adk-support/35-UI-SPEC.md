---
phase: 35
slug: a2a-protocol-implementation-google-adk-support
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-05
---

# Phase 35 - UI Design Contract

> Visual and interaction contract for A2A protocol registration, task visibility, and Google ADK proof surfacing. Generated for `$gsd-ui-phase 35`, verified against Phase 35 context and research.

---

## Phase UI Scope

Phase 35 is not a redesign. It extends the Phase 34 Agent Registry and Flow roster so Kitchen can clearly show standards-compatible A2A agents, Google ADK proof agents, task lifecycle state, and secure multi-machine connection details.

Primary surfaces:
- `apps/kitchen/src/app/agents/page.tsx` - Agent Registry page.
- `apps/kitchen/src/components/agents/*` - registration form, registry table, and detail drawer.
- `apps/kitchen/src/app/flow/page.tsx` - live Flow dashboard.
- `apps/kitchen/src/components/flow/*` - graph nodes, node detail panel, and live activity.

Non-goals:
- Do not introduce a new visual system.
- Do not create a full A2A observability product in Phase 35.
- Do not expose API keys, bearer tokens, raw auth headers, or internal-only network details.
- Do not move LangGraph routing intelligence into the UI; Phase 36 owns orchestration policy.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none |
| Preset | not applicable |
| Component library | existing local Kitchen components, Radix-derived primitives where already present |
| Icon library | existing icon/text badge patterns only; do not add a new icon dependency |
| Font | inherit existing Kitchen app typography |

Implementation notes:
- Preserve the current dark operational dashboard language: slate backgrounds, thin borders, amber hierarchy, compact tables, and drawers.
- A2A UI should feel like an operator console for real machines, not a marketing page.
- Prefer additive table columns, badges, validation panels, and drawer sections over large new layouts.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline badge gaps, dense metadata separators |
| sm | 8px | Compact control spacing, table cell inner gaps |
| md | 16px | Default element spacing, card padding, drawer section spacing |
| lg | 24px | Page section padding, form group separation |
| xl | 32px | Layout gaps between major registry areas |
| 2xl | 48px | Empty states and validation result blocks |
| 3xl | 64px | Page-level spacing only; avoid inside dense operational panels |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 500 | 1.3 |
| Heading | 24px | 700 | 1.2 |
| Display | 32px | 700 | 1.1 |

Typography contract:
- Use `text-xs` for protocol, auth, version, validation, and liveness metadata.
- Use `text-sm` for table rows, form labels, helper text, and task status summaries.
- Use `text-2xl font-bold text-amber-500` for page titles to match the existing Registry and Flow pages.
- Do not add oversized hero typography for A2A registration; this is a working tool surface.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#020617` | App background and page depth |
| Secondary (30%) | `#0f172a` | Cards, tables, drawers, validation panels |
| Accent (10%) | `#f59e0b` | Page titles, selected filters, primary A2A actions, important labels |
| Destructive | `#ef4444` | Deregister/cancel/destructive confirmations only |

Supporting status colors:
- Success/active: `#10b981` for reachable, validated, completed, and active states.
- Info/remote: `#0ea5e9` for A2A, ADK, streaming, HTTPS, and Tailscale/LAN indicators.
- Warning/input: `#f59e0b` for input-required, degraded validation, pending auth setup, or reconnecting streams.
- Error/failed: `#ef4444` for invalid card, failed task, unreachable remote, rejected auth, or revoked key.
- Muted metadata: `#64748b` for non-actionable endpoint/version timestamps.

Accent reserved for: page titles, selected protocol/status filters, primary registration action, one-time secret warning, and high-importance operational labels. Do not use amber for every clickable element.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Register A2A Agent |
| Empty state heading | No A2A agents registered |
| Empty state body | Add an agent-card URL from Google ADK or another A2A-compatible agent to bring it into Kitchen. |
| Error state | Agent card could not be validated. Check the URL, auth scheme, and network reachability. |
| Destructive confirmation | Deregister agent: This removes the agent from active routing but preserves task and audit history. |

Additional required copy:
- A2A registration helper: `Paste the agent-card URL exposed by the remote agent. Kitchen will validate the card, security scheme, endpoint, and declared skills before adding it to the registry.`
- ADK helper: `For Google ADK, use the agent-card URL from an A2A-enabled ADK server, for example an agent served with adk api_server --a2a.`
- Auth helper: `Kitchen never displays stored bearer tokens or API keys after creation.`
- Private network helper: `Private network or Tailscale URLs are recommended for startup multi-machine deployments. HTTPS is supported when the agent is reachable outside the LAN.`
- Stream fallback helper: `Live stream disconnected. Use task lookup for the latest durable state.`
- Compatibility helper: `Using official A2A message and task endpoints; legacy roadmap method names are compatibility-only if implemented.`

Tone:
- Matter-of-fact, operational, and specific.
- Avoid vague phrases like `something went wrong` when validation can identify card URL, auth, version, endpoint, or liveness issues.
- Avoid claiming an agent is secure merely because it is registered; say which security scheme is configured and whether the latest validation passed.

---

## Interaction Contract

### Agent Registry

The Registry is the primary A2A onboarding surface.

Required additions:
- Registration must include an A2A card URL mode or field that is distinct from manual REST/local registration.
- The registration flow must preview or summarize validated card details before or immediately after registration: agent name, endpoint URL, A2A version, protocol binding, auth/security scheme, skills/capabilities, input/output modes, and validation timestamp.
- A2A agents must store and display `protocol: a2a` through the canonical Phase 34 registry path, not a separate UI-only list.
- Registry filters must continue to include `a2a` as a protocol option.
- The table or drawer must make multi-machine status scannable: endpoint host, private-network/Tailscale/HTTPS indicator when known, last validation, last heartbeat/liveness, and whether streaming is supported.
- ADK proof agents should be labeled with an `ADK` or `Google ADK` badge only when the card/fixture metadata supports that claim.

Required safety behavior:
- Never display full bearer tokens, API keys, auth headers, or credential environment variables.
- If a one-time key is shown by existing Phase 34 behavior, keep the one-time warning pattern and do not persist/re-render it later.
- If validation fails, keep the failed URL visible enough for debugging but redact embedded credentials from the URL.
- Deregistration copy must clarify that task/audit history remains preserved.

### Flow Dashboard

The Flow dashboard should show that A2A agents are live participants in the system without becoming the task console.

Required additions:
- Registered A2A agents must appear dynamically from the canonical roster used by Phase 34.
- A2A nodes/cards must include compact badges for `A2A`, optional `ADK`, connection state, and streaming support when known.
- Flow node details should expose safe metadata: endpoint host, protocol version, declared capabilities, last heartbeat/validation, active task count if available, and latest task status summary.
- Do not hardcode ADK fixture names or synthetic nodes. The ADK sample must appear because it registered successfully.
- Do not show raw task payloads in the main graph. Use the detail panel or activity feed for concise task lifecycle events.

### A2A Task State

If Phase 35 adds task-state UI in Registry details, Flow details, or activity feed, use these labels:
- `submitted`
- `working`
- `input-required`
- `completed`
- `failed`
- `canceled`

Task UI requirements:
- Show durable task ID and correlation/context ID only where they help debugging; keep them copyable but visually muted.
- Show streaming state separately from durable task state. A disconnected stream is not automatically a failed task.
- Use `task lookup available` or equivalent helper copy when SSE disconnects but polling fallback remains valid.
- Terminal states must be visually distinct from live/working states.

### Loading, Empty, And Error States

Loading:
- Use the existing amber spinner/skeleton style for registry fetches.
- A2A card validation should show a compact inline validating state near the URL field or submit button.

Empty:
- Registry-wide empty state can keep the existing simple table empty treatment.
- A2A-filter empty state must use the copywriting contract's A2A-specific empty copy.

Errors:
- Validation errors should identify one primary cause: unreachable URL, unsupported scheme, invalid card schema, unsupported A2A version, missing endpoint, duplicate identity, auth mismatch, or liveness failure.
- Authorization failures should not reveal whether hidden tasks or agents exist.
- UI should not render stack traces, raw exception messages, or raw response bodies from remote agents.

---

## Layout Contract

Agent Registry page:
- Preserve the current page structure: header, stats cards, registration form, filters, table, drawer.
- Registration form may grow one focused A2A section, but should not push the table far below the fold on desktop.
- Use responsive stacking for the A2A validation preview; avoid horizontal overflow in tables on mobile.
- Dense metadata belongs in the drawer before it belongs in table columns.

Registry table:
- Keep columns compact. Prefer one `A2A`/`ADK` badge cluster and one liveness/validation summary over many narrow columns.
- Capabilities should remain truncated with `+N` overflow behavior.
- Endpoint host should be truncated and full safe URL available in detail view, never credential-bearing.

Flow:
- Preserve the existing graph-first layout.
- A2A/ADK badges should be legible at normal zoom and not dominate node labels.
- Use node detail panel for the richer A2A metadata; do not turn every graph node into a mini table.

---

## Accessibility Contract

- Protocol/status/auth badges must not rely on color alone; include text labels such as `A2A`, `ADK`, `Bearer`, `Validated`, `Unreachable`, or `Revoked`.
- Validation errors must be associated with the input that caused them.
- Loading and validating states must keep controls disabled only while duplicate submissions would be unsafe.
- Destructive deregister/cancel actions must be keyboard reachable and require clear confirmation if a confirmation pattern is present elsewhere in the page.
- Truncated endpoint/card URLs must have accessible full safe text in details or title text after credential redaction.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not required |
| third-party | none | no third-party UI blocks allowed for this phase |

Dependency rule:
- Do not add a new component registry, icon library, animation library, or design framework for Phase 35 UI work.
- If implementation later needs a component, compose it from existing Kitchen primitives first.

---

## Six-Dimension Verification

| Dimension | Requirement | Verdict |
|-----------|-------------|---------|
| Copywriting | Specific A2A/ADK registration, validation, auth, stream fallback, and destructive copy exists. | PASS |
| Visuals | Preserves existing dark operational console language and defines where A2A/ADK metadata appears. | PASS |
| Color | Defines dominant/secondary/accent/destructive/status colors and reserves amber. | PASS |
| Typography | Locks current Kitchen text hierarchy and metadata sizing. | PASS |
| Spacing | Uses 4px-based spacing scale with no exceptions. | PASS |
| Registry Safety | Forbids new third-party UI blocks/dependencies in this phase. | PASS |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-05-05
