# Memroos UI Migration — Handoff Document

**Branch:** `main`  
**Last commit:** `cffb563` — feat: Phase 4 — Workflow Map SVG topology view  
**Phases complete:** 1 (Charts), 2 (Shell/Nav), 3 (Operations/NOC screen), 4 (Workflow Map)  
**Remaining:** Phase 5 (Cleanup), Phase 6 (Full re-skin)

---

## Mandatory rules (AGENTS.md + CLAUDE.md)

1. **Before editing any existing function/class/method:** run `gitnexus_impact({target: "SymbolName", direction: "upstream"})` via the `mcp__gitnexus__impact` MCP tool and report the blast radius. Warn the user on HIGH or CRITICAL risk before proceeding.
2. **Before every commit:** run `mcp__gitnexus__detect_changes` to verify scope.
3. **Never rename symbols with find-and-replace** — use `mcp__gitnexus__rename`.
4. **Before writing any Next.js code:** read the relevant guide in `node_modules/next/dist/docs/` (non-standard build — training data may be wrong).
5. This is **Next.js 16.2.4**, **React 19.2.4**, **Tailwind CSS v4** (PostCSS), **shadcn/ui base-nova**, **@base-ui/react 1.3.0**. APIs differ from training data.

---

## Design system

**Token module:** `apps/memroos/src/lib/noc-theme.ts`  
All NOC components use `NOC.*` constants (not CSS vars) so the light-only operator surface never flips under the global `.dark` variant.

```typescript
// Key tokens (full list in noc-theme.ts)
NOC.cream    = "#fafaf7"   // page background
NOC.paper    = "#ffffff"   // card background
NOC.fog      = "#f2f2ee"   // subtle fill
NOC.rule     = "#e4e4dd"   // border
NOC.ink      = "#0f0f0e"   // primary text
NOC.terra    = "#a8392c"   // accent / alert
NOC.peach    = "#f2e2dc"   // active bg
NOC.success  = "#2f7a4f"
NOC.warn     = "#a86a1c"
NOC.info     = "#2c5fa8"
NOC_FONT_MONO = "'IBM Plex Mono', ui-monospace, ..."
```

**Shared chart primitives** (`apps/memroos/src/components/shared/charts/`):
- `Spark` — sparkline + optional fill + endpoint dot
- `AreaStack` — stacked area with grid/axis  
- `HBars` — horizontal bars (label/bar/value)
- `Heatmap` — 7×24 opacity grid
- `Donut` — SVG donut + % label
- All exported from `index.ts` barrel

**NOC micro-primitives** (`apps/memroos/src/components/operations/noc-primitives.tsx`):
`NocCard`, `NocPanelHeader`, `Eyebrow`, `Mono`, `Delta`, `Legend`, `SampleChip`, `PillBtn`, `severityColor`

**Mock data module** (`apps/memroos/src/lib/noc-mock-data.ts`):
All typed sample data for every NOC panel. Efficiency signals are fully mocked (no API endpoint). The `_isMock = true` export and `SampleChip` component make mock panels visually identifiable.

---

## What was built (Phases 1–3)

### Phase 1 — Chart primitives
`apps/memroos/src/components/shared/charts/` — 5 pure-SVG chart components with TypeScript types.

### Phase 2 — Shell + 8-group navigation
- `sidebar.tsx` — 20-item flat nav collapsed to 8 groups with two-line labels, badges, active border
- `top-bar.tsx` — global search (⌘K), health dot, mono clock, avatar
- `shell.tsx` — cream background workspace, `lg:ml-[232px]`

Nav groups (sidebar NAV_ITEMS):
```
Operations  → /           (match: /, /ledger, /business-ops)
Workflow Map→ /flow
Memory      → /notebooks  (match: /notebooks, /library)
Skills      → /cookbooks
Agents      → /agents
Engage      → /dispatch   (match: /dispatch)
Improve     → /apo        (match: /apo, /seal, /evals, /agent-autogen, /memory-autogen)
Governance  → /audit      (match: /audit, /escalations, /team, /settings/api-keys, /settings/compliance)
```

### Phase 3 — Operations/NOC screen
`apps/memroos/src/components/operations/` — 13 panel components + page composer.

`apps/memroos/src/app/page.tsx` now renders `<OperationsNoc />` for operator hosts (non-public-landing domains). The old `<OperatorHome />` component still exists at `apps/memroos/src/components/workspace/operator-home.tsx` — do not delete it until Phase 5.

### Phase 4 — Workflow Map screen
`apps/memroos/src/components/workflow/` — `TopologyCanvas` + `NodeDetailRail`.

`apps/memroos/src/app/flow/page.tsx` now renders `TopologyCanvas` as the default view. `ReactFlowCanvas` is preserved behind a toggle ("Open in Flow" → "Topology view"). All original data hooks, `VoicePanel`, `OrchestrationHilPanel`, and `ActivityFeed` are preserved. Commit: `cffb563`.

---

## Phase 4 — Workflow Map screen ✅ COMPLETE

**Commit:** `cffb563` — feat: Phase 4 — Workflow Map SVG topology view  
**Impact analysis:** `FlowPage` LOW (0 upstreams), `ReactFlowCanvas` LOW (0 upstreams) — safe to proceed.

### What was built

**`apps/memroos/src/components/workflow/topology-canvas.tsx`**  
Pure SVG topology (1180×520 viewBox) with:
- 17 nodes across 5 column groups (SOURCES, GATEWAY, MEMROOS, STORES, AGENTS)
- 25 edges with cubic bezier paths; stroke width and opacity scale with throughput (0..1)
- 4 animated pulse dots on key edges using `<animateMotion>`
- Clickable nodes — selected node gets terra border (2px), others get ruleStrong (1px)
- Node fill by type: `core` → peach, `gate` → infoBg, `store` → fog, `sink` → successBg, `src/agent` → paper
- Agent status dot (top-right corner): terra = busy, warn = drift, cold = idle
- MemroOS core node shows stage labels: capture → consolidate / retrieve → act → improve
- 5-KPI stats strip below the canvas (Inbound, Packs assembled, Avg time to context, Outcomes, Loop close)
- Legend for 5 edge kinds (Source feeds, Context assembly, Pack delivery, Outcome captured, Memory loop)
- All colors from `NOC.*` constants — no hardcoded hex

**`apps/memroos/src/components/workflow/node-detail-rail.tsx`**  
Right-rail panel (320px) with:
- Selected node card: title, sub-label, 3-stat grid (mono numerals), notes box (fog bg)
- "Open page" + "Engage" pill buttons
- Bottlenecks table: 4 entries with colored value column (warn/terra/success)
- Suggested-change panel (peach bg, terraDeep text): pre-summarizer recommendation + "Apply via APO" CTA
- Default selection falls back to `memroos` if `nodeId` is null or unrecognized

**`apps/memroos/src/app/flow/page.tsx`** (modified)  
- Added imports: `TopologyCanvas`, `NodeDetailRail`, `NOC`, `NOC_FONT_BODY`, `NOC_FONT_MONO`
- Added state: `showFlow` (boolean, default `false`), `topoSelectedId` (string | null, default `"memroos"`)
- Header replaced: dark amber/slate → NOC terra eyebrow + ink title + muted subtitle
- Toggle button: ink-solid "Open in Flow" / paper-outline "Topology view"
- Default view: `TopologyCanvas + NodeDetailRail` in a `1fr 320px` grid
- Flow view (toggle): existing `ReactFlowCanvas + NodeDetailPanel` (unchanged)
- All 8 original data hooks preserved; `VoicePanel`, `OrchestrationHilPanel`, `ActivityFeed` always visible
- Activity feed panel re-styled to NOC paper/rule card (removed dark slate bg)

---

## Phase 5 — Cleanup & consolidation

### 1. Remove operator-home.tsx
After Phase 3 is verified in prod, delete:
`apps/memroos/src/components/workspace/operator-home.tsx`

**Before deleting:** Run `gitnexus_impact({target: "OperatorHome", direction: "upstream"})` to confirm no remaining importers. The only known importer (`page.tsx`) was already switched to `OperationsNoc` in Phase 3.

### 2. Sub-tab wiring
The 8 nav groups each point to a primary route. The plan spec calls for sub-tabs inside those pages so that all old destinations remain reachable through the UI (not just via direct URL).

Required sub-tab wiring:
| Group | Primary route | Sub-tabs to wire |
|-------|--------------|-----------------|
| Memory | `/notebooks` | Knowledge (`/library`), Notebooks |
| Improve | `/apo` | SEAL (`/seal`), Evals (`/evals`), Autogen (`/agent-autogen`, `/memory-autogen`) |
| Governance | `/audit` | Escalations (`/escalations`), Team (`/team`), API Keys (`/settings/api-keys`), Compliance (`/settings/compliance`) |

### 3. Scrub dark-navy remnants
Search for any remaining `bg-slate`, `bg-gray-900`, `bg-zinc-900`, dark operator classes that weren't caught in Phase 2. Replace with NOC cream/paper equivalents.

### 4. Full build
Run `cd apps/memroos && npx next build` — must pass with 0 new errors.

---

## Phase 6 — Full re-skin of all sub-pages

**Goal:** All authenticated pages use the NOC visual language. No dark-slate bleed anywhere.

### Step 1 — Build shared UI primitives first
Create `apps/memroos/src/components/shared/ui/`:

| File | Component | Description |
|------|-----------|-------------|
| `card.tsx` | `Card` | White card with `NOC.rule` border, configurable padding |
| `stat.tsx` | `Stat` | Eyebrow label + mono numeral + optional delta |
| `pill.tsx` | `Pill` | Tone-variants: `success`, `warn`, `info`, `terra`, `neutral` |
| `btn.tsx` | `Btn` | Variants: `ink` (solid), `terra` (solid), `ghost` (outline), `flat` (no border) |
| `page-header.tsx` | `PageHeader` | Eyebrow (terra) + title + optional hint + optional actions slot |
| `index.ts` | barrel export | |

Design source in `app.jsx` (extract from bundle, same command as above). These mirror the design's Card/Stat/Pill/Btn/PageHeader primitives.

### Step 2 — Re-skin each page

**Impact-analyze before editing each page's root component.**  
Preserve all data hooks and business logic — visual layer only.

| Route | Page file | Primary things to change |
|-------|-----------|--------------------------|
| `/ledger` | `app/ledger/page.tsx` | Replace dark headers with `PageHeader`, wrap stat rows in `Stat`, use `Card` |
| `/seal` | `app/seal/page.tsx` | Same pattern |
| `/apo` | `app/apo/page.tsx` | Same pattern |
| `/evals` | `app/evals/page.tsx` | Same pattern |
| `/audit` | `app/audit/page.tsx` | Same pattern |
| `/escalations` | `app/escalations/page.tsx` | Same pattern |
| `/agents` | `app/agents/page.tsx` | Agent cards → `Card` + `Pill` for status |
| `/notebooks` | `app/notebooks/page.tsx` | Same pattern |
| `/library` | `app/library/page.tsx` | Same pattern |
| `/cookbooks` | `app/cookbooks/page.tsx` | Same pattern |
| `/dispatch` | `app/dispatch/page.tsx` | Chat/directive UI — use `Card` wrapper + NOC input style |
| `/business-ops` | `app/business-ops/page.tsx` | Same pattern |
| `/team` | `app/team/page.tsx` | Same pattern |
| `/settings/api-keys` | `app/settings/api-keys/page.tsx` | Same pattern |
| `/settings/compliance` | `app/settings/compliance/page.tsx` | Same pattern |

### Checklist per page
- [ ] `gitnexus_impact` run on the page's root component  
- [ ] `PageHeader` replaces old title/subtitle block  
- [ ] All stat figures use `Stat` (mono numerals, terra eyebrow)  
- [ ] Status indicators use `Pill` with appropriate tone  
- [ ] Cards/panels use `Card` (white, `NOC.rule` border)  
- [ ] Buttons use `Btn` variants  
- [ ] No `bg-slate-*`, `bg-gray-9*`, `bg-zinc-9*`, `text-white` on dark bg  
- [ ] Route renders authenticated without visual regressions  
- [ ] `gitnexus_detect_changes` run before commit  

**Commit strategy:** One commit per page (or per small cluster of related pages).

---

## Key file locations

```
apps/memroos/src/
├── app/
│   ├── page.tsx                          ← home: LandingPage | OperationsNoc
│   ├── flow/page.tsx                     ← Phase 4 target
│   ├── ledger/, seal/, apo/, ...         ← Phase 6 targets
│   └── globals.css                       ← Tailwind v4 tokens (already correct)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                   ← 8-group nav (Phase 2 done)
│   │   ├── top-bar.tsx                   ← search/clock/avatar (Phase 2 done)
│   │   └── shell.tsx                     ← cream workspace (Phase 2 done)
│   ├── operations/                       ← 13 NOC panels (Phase 3 done)
│   │   └── index.tsx                     ← OperationsNoc page composer
│   ├── shared/
│   │   ├── charts/                       ← 5 SVG charts (Phase 1 done)
│   │   └── ui/                           ← Phase 6: Card/Stat/Pill/Btn/PageHeader
│   ├── workflow/                         ← Phase 4 DONE
│   │   ├── topology-canvas.tsx           ← SVG topology (primary /flow view)
│   │   └── node-detail-rail.tsx          ← right-rail (selected node + bottlenecks)
│   └── workspace/
│       └── operator-home.tsx             ← Phase 5: delete after NOC verified
└── lib/
    ├── noc-theme.ts                      ← NOC token constants
    ├── noc-mock-data.ts                  ← typed sample data (all mock panels)
    └── api-client.ts                     ← 1550-line hook library (real data)
```

## Available real hooks (api-client.ts)
These hooks already exist and return real data. Use them in Phase 6 re-skins where relevant:

```typescript
useAgents()           // agent list, status, task, latency
useHealth()           // service health status[]
useTokenStats()       // spend, token counts
useModelUsage()       // model breakdown
useMemoryStats()      // memory tier stats
useTimeSeries()       // time-bucketed metrics
useActivity()         // nodeActivity, events
useSkills()           // skill list, coverage gaps, failures
useAuditLog()         // audit events
useSecurityReport()   // security scan summary
useOrchestrationHil() // HIL queue
usePaperclipFleet()   // paperclip agent fleet
useHiveFeed()         // hive feed events
useModelRoutingDashboard() // model routing telemetry
useMemoryTierHealth() // tier health
useEscalations()      // escalation queue
useRecallStats()      // recall metrics
useKnowledge()        // knowledge docs
useSealProposals()    // SEAL proposals
```

---

## Design bundle (if needed)
The original Claude Design bundle is cached at:
```
<local-claude-cache>/projects/<repo-cache-key>/5c965b72-3a55-4eb7-87ee-a97bab2e12d0/tool-results/webfetch-1779052829538-j0eye1.bin
```
Extract any file:
```bash
gunzip -c <path-to-bin> | tar -x -O "memroos-app-ui/project/<filename>"
# Key files: app.jsx, operations.jsx, workflow-map.jsx, chats/chat1.md
```
If already extracted, check `/tmp/memroos-design/memroos-app-ui/project/`.

---

## What NOT to do
- **Never delete any route** — `/apo`, `/seal`, `/evals`, `/dispatch`, `/audit`, etc. all stay
- **Never delete `OperatorHome`** until Phase 5 impact analysis confirms zero importers
- **Never use the `Today` screen** from the design bundle — it was abandoned after Turn 1 of the design chat
- **Never substitute recharts** for the pure-SVG chart primitives in `components/shared/charts/`
- **Never rename `.ak-workspace`** CSS class or `/cookbooks` route — separate cleanup pass
- **Never hardcode colors** in NOC components — always use `NOC.*` constants from `noc-theme.ts`
