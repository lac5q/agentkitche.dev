# Goal: agentkitchen.dev as Agent Workflow Memory Infrastructure

*Created: 2026-05-11*

## North Star

Make `agentkitchen.dev` the control plane where AI-native teams retain what their agents learn, retrieve the right context at runtime, dispatch work to the right agent, and turn repeated work into reusable skills.

The product name stays `agentkitchen.dev` for now. The positioning shifts from kitchen metaphor to agent memory and workflow infrastructure.

## Primary Users

1. Product teams that need discovery, launch, roadmap, and customer-context memory to survive across agents and sessions.
2. Sales teams that need account history, objections, competitive context, and follow-up context available to every agent-assisted workflow.
3. Engineering teams that need architecture decisions, incidents, repo patterns, fixes, tests, and runbooks available to debugging, code review, migration, and onboarding agents.

## Core Loop

1. Capture work from conversations, docs, code, tasks, tools, and agent activity.
2. Consolidate it into semantic knowledge, episodic memory, and procedural skills.
3. Retrieve permission-aware context packs for the current task.
4. Dispatch the task to an agent with the needed memory, tools, and source evidence.
5. Improve memory and skills from the outcome so the next run starts smarter.

## Product Promises

- Agents should not start from zero when a team already solved, discussed, debugged, or decided something.
- Memory should be visible as retained context and consumed context, not hidden infrastructure.
- Dispatch should prove whether an agent actually received work, what transport was used, and what the operator must do next.
- Skills should emerge from repeated successful workflows and become reusable procedural memory.
- Knowledge, memory, agents, dispatch, usage, and governance should be understandable as one operating system.

## First Showcase Workflows

### Product

- Retains: interview notes, launch learnings, roadmap decisions, beta feedback, usage patterns.
- Consumed by: PRD drafting, prioritization, release notes, discovery synthesis, beta follow-up.
- Proof: evidence survives from discovery to delivery.

### Sales

- Retains: CRM notes, call takeaways, objections, competitor mentions, buyer preferences.
- Consumed by: account briefs, talk tracks, follow-up emails, renewal and expansion strategy.
- Proof: agents reuse the last best answer instead of rediscovering it.

### Engineering

- Retains: architecture decisions, incidents, test history, deploy fixes, repo patterns, runbooks.
- Consumed by: debugging, code review, migrations, onboarding, incident response.
- Proof: a new agent starts with the team's lived technical context.

## Development Process Goal

Every development cycle should make the memory loop more real:

1. Define the workflow being improved and the role it serves.
2. Show what knowledge or memory is retained.
3. Show how an agent consumes that context during execution.
4. Make dispatch and outcome status observable.
5. Convert repeated patterns into skills.
6. Add tests and visual verification that prove the workflow works end to end.

## GSD Phase Completion Goal

Complete every planned GSD phase in the current roadmap without losing the product focus above. Each phase should either harden the agent workflow memory loop, make the product safer to operate, improve model/runtime quality, or reduce latency and operational drag.

### Completion Path

1. Finish **Phase 41: OSS Polish** so the public repository is licensed, contributable, secure, and continuously verified.
2. Complete **v2.1 Security + Trust Layer, Phases 42-45** so every agent action has the right permission, audit, and operator control model.
3. Complete **v2.2 LLM Optimization + Evaluation, Phases 46-49** so model choice and prompt/runtime behavior are measured, recommended, and regression-tested.
4. Complete **v2.3 Agent Runtime Enhancements, Phases 50-52** so agents get better middleware, memory client behavior, and local observability.
5. Complete **v2.4 Performance + Caching, Phases 53-54** so memory retrieval, API responses, and dashboard usage feel fast under real workloads.

### Remaining Goal: Phases 50-54

Status: completed 2026-05-11.

The remaining roadmap block completed the agent-runtime and performance arc:

1. **Phase 50** added a Hermes-compatible middleware runtime for validation, redacted logging, outcome logging, and skill health alerts.
2. **Phase 51** added an agent memory client v2 with semantic-ish relevance search, context injection caps, duplicate merging, TTL expiration, archive-on-purge, and backward-compatible memory tool calls.
3. **Phase 52** added an offline static observability dashboard generated from Hermes tool outcome logs.
4. **Phase 53** added an in-memory LRU response cache with TTLs, tags, stats, purge controls, and cached safe route responses.
5. **Phase 54** added startup prewarming, latency budgets, and a cache health dashboard so performance regressions become visible.

### Immediate Goal: Phases 41-49

Status: completed 2026-05-11.

The execution block was **Phase 41, Phases 42-45, and Phases 46-49**. Treat this as one coherent release-readiness arc:

1. **Phase 41 closes v2.0** by making `agentkitchen.dev` safe to publish, fork, contribute to, and continuously verify.
2. **Phases 42-45 close the security gap** created by open agent surfaces: A2A, REST registration, dispatch, memory writes, and tool use must have pre-flight scanning, capability policy, audit visibility, and progressive security modes.
3. **Phases 46-49 close the quality gap** created by multi-model agent work: model selection should be telemetry-backed, recommendation-driven, evaluated by task class, and explainable in the dashboard.

#### Phase 41 Goal: OSS Polish

Ship the public-readiness layer:

- Root MIT license.
- Contribution guide with setup, branch, test, and PR expectations.
- Security policy and responsible disclosure path.
- Issue templates for bugs and features.
- Public CI that runs lint, typecheck, tests, and Docker/health smoke checks.

Phase 41 is done when a new developer can understand how to contribute safely and CI proves the basic product surfaces still work.

#### Phases 42-45 Goal: Security + Trust Layer

Ship the trust layer before adding more optimization:

- **Phase 42:** Agent Shield + Iris pre-flight foundation is verified as the baseline for dispatch/A2A scanning and blocking.
- **Phase 43:** Tool permission guard and policy enforcement are verified across dispatch, A2A, and memory write paths.
- **Phase 44:** Security operations UI exposes event history, blocked attempts, severity trends, scan health, and release-ready reports.
- **Phase 45:** Progressive security capability exposure makes security modes and `agent-shield`/Iris capability status discoverable through registry and progressive tool surfaces.

Phases 42-45 are done when an operator can answer: what was blocked, why it was blocked, which agent/tool/memory path was involved, and what security mode was active.

#### Phases 46-49 Goal: LLM Optimization + Evaluation

Ship the model quality loop:

- **Phase 46:** Model routing telemetry captures task type, model, cost, latency, quality score, success rate, and context tags.
- **Phase 47:** Model recommendation API lets agents ask which model to use and report outcomes afterward.
- **Phase 48:** Evaluation rigs and rubrics compare model choices by task class and catch regressions.
- **Phase 49:** Optimization dashboard explains best model by task type, cost/quality tradeoffs, drift, and recommendation rationale.

Phases 46-49 are done when model choice is no longer a static preference. It becomes an evidence-backed recommendation loop with measurable quality, cost, and latency outcomes.

### Phase Done Definition

Every GSD phase is complete only when:

1. The phase goal is restated in product terms.
2. The plan maps requirements to code, UI, tests, and docs.
3. Implementation is verified through automated tests.
4. Risky user-facing flows receive browser or visual verification.
5. Security and data-access implications are reviewed.
6. GitNexus detects only the expected affected symbols and flows.
7. A summary, verification note, and any follow-up debt are written back into planning.

### Final Completion Definition

The full GSD program is complete when `agentkitchen.dev` can be shipped as a memory-backed agent workflow hub with:

- Public-ready OSS hygiene.
- Permissioned and auditable agent execution.
- Measured LLM/model routing quality.
- Reliable agent runtime observability.
- Fast memory retrieval and dashboard response.
- Product, sales, and engineering workflows that visibly retain and consume memory.

## Success Criteria

- A user can open `agentkitchen.dev` and immediately understand that the product is about memory-backed agent workflows.
- Product, sales, and engineering use cases are visible without explanation.
- Memory retention and memory consumption are represented in the UI.
- Dispatch makes transport limitations explicit instead of pretending work was pushed when it was only queued.
- Voice/chat failures show operator-friendly explanations.
- Agent status reflects recent real activity instead of stale heartbeat-only state.
- The next layer of the product clearly becomes skills: reusable procedures extracted from repeated agent work.

## Immediate Goal: Agent Engagement Repair

Status: completed 2026-05-11.

The voice/chat/dispatch surface was still failing because provider chat could hit quota limits and dispatch only accepted remote transport agents while the UI listed local registered agents. The repair goal was to make engagement honest and usable:

1. Put chat, voice, standups, conference prompts, diagnostics, and recent delegations on one short `/dispatch` page.
2. Remove the old Voice & Chat panel from the overview page.
3. Allow local registered agents to receive queued dispatch tasks through the existing adapters.
4. Add per-agent diagnostics for chat runner readiness, dispatch delivery mode, and voice/TTS prerequisites.
5. Show provider and runner failures in operator-readable language.
6. Verify the page on desktop and mobile with no console errors or horizontal overflow.
