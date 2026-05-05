# Phase 35: A2A Protocol Implementation + Google ADK Support - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 35 makes Kitchen an A2A-native hub for a real startup-style multi-agent network. Agents may run on different laptops, cloud VMs, containers, or private-network hosts. Kitchen should expose its own A2A agent card, accept A2A task lifecycle calls, ingest/register external A2A agents through the Phase 34 canonical registry, delegate tasks to registered A2A agents, stream task progress, and prove Google ADK compatibility with a real runnable fixture.

This phase owns:
- Kitchen's public A2A agent card at `/.well-known/agent.json`.
- Spec-compatible A2A 1.0 JSON-RPC task/message routes and SSE streaming behavior.
- A2A agent-card ingestion/discovery that writes through the Phase 34 `registerAgent()` canonical registry service with `protocol: "a2a"`.
- Durable A2A task state sufficient for cross-machine clients to reconnect or poll via task lookup.
- A2A delegation to registered agents by declared capabilities or explicit target.
- Secure machine-to-machine A2A requests using the existing Phase 34 bearer/API-key foundation.
- A Google ADK proof fixture/sample that registers through A2A and appears in Flow.

This phase does not own:
- Full LangGraph routing policy, retries, HIL, or orchestration intelligence. Phase 36 owns that brain on top of the A2A transport layer.
- OAuth/OIDC provider integration, multi-user auth, or enterprise SSO. The auth layer should be designed so those can be added later.
- Public documentation polish beyond testable examples and clear contracts for Phase 40 to document.
- Docker/setup changes for multi-service OSS onboarding. Those remain Phases 38-39.
</domain>

<decisions>
## Implementation Decisions

### Spec Compatibility
- **D-01:** Follow the official A2A 1.0 specification as the canonical contract, even where the roadmap wording is stale.
- **D-02:** Treat `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`, and task listing support as the A2A method family to research and plan against.
- **D-03:** Do not make `tasks/send` the canonical Kitchen method just because the roadmap says it. If compatibility aliases are cheap and safe, the planner may include them as deprecated/compatibility-only, but spec-native names must be primary.
- **D-04:** Generated or hand-written A2A types should be traceable to the current spec/proto/schema, not invented from memory.

### Multi-Machine Startup Deployment
- **D-05:** Phase 35 should be production-shaped for a startup with agents on multiple machines, not a localhost-only demo.
- **D-06:** Support both private-network and HTTPS-reachable agents, with private network/Tailscale/LAN examples as the recommended safe default.
- **D-07:** Registered A2A agents need a reachable agent-card URL, base A2A endpoint URL, declared capabilities/skills, protocol/version metadata, liveness state, and auth metadata.
- **D-08:** Do not assume shared filesystem access between Kitchen and agents. All integration paths must work over HTTP/A2A.

### Registration And Discovery
- **D-09:** A2A registration should be agent-card ingestion into the canonical registry, not a separate A2A registry model.
- **D-10:** Kitchen should fetch or receive an A2A agent card URL, validate it, normalize capabilities/skills, and call the Phase 34 `registerAgent()` service with `protocol: "a2a"`.
- **D-11:** If Kitchen adds a helper endpoint for registration, that endpoint is an adapter around agent-card ingestion. It must not become a custom protocol that competes with A2A discovery.
- **D-12:** Registration validation should check reachability, required card fields, endpoint URL, protocol/version compatibility, declared auth scheme, capabilities/skills, duplicate identity, and remote liveness/heartbeat behavior.

### Task Ownership And Delegation
- **D-13:** Kitchen should be a durable thin A2A broker in Phase 35: enforce auth, persist task state, expose A2A methods, and delegate to registered A2A agents.
- **D-14:** Kitchen should not become the full orchestration brain yet. Capability routing can be simple and testable; LangGraph owns routing policy, retry policy, and HIL in Phase 36.
- **D-15:** Task state must be durable enough for multi-machine clients and agents to disconnect/reconnect and still use task lookup for current/final state.
- **D-16:** Delegation should preserve trace/correlation IDs and task lineage fields where practical so Phase 36 can build on them.

### Streaming And Reliability
- **D-17:** Implement A2A streaming as live SSE through the spec-compatible streaming method, plus polling/current-state fallback through task lookup.
- **D-18:** Streams should emit status/artifact progress while connected and close when the task reaches a terminal state.
- **D-19:** Do not require resumable stream backfill in Phase 35 unless the current A2A spec requires it. Reliable polling via task lookup is the required fallback.
- **D-20:** Multi-machine reliability matters: transient network loss should not lose the task record or final result.

### Security Model
- **D-21:** Use the Phase 34 bearer/API-key foundation for A2A machine-to-machine security in Phase 35.
- **D-22:** Store only hashed keys, support revocation, bind requests to authenticated agent identity, and reject body-provided identity spoofing.
- **D-23:** A2A endpoints must reject unauthenticated and unauthorized calls, and the Kitchen agent card must declare the security scheme it actually enforces.
- **D-24:** Add audit/security records for task calls and authorization failures where existing audit patterns support it.
- **D-25:** Avoid overcomplicating with OAuth/OIDC in Phase 35, but keep interfaces extensible so stronger enterprise auth can be added later.

### Google ADK Proof
- **D-26:** Google ADK support needs executable proof, not docs-only compatibility.
- **D-27:** Include a small local or LAN/Tailscale-reachable ADK-style A2A fixture/sample that exposes an agent card, registers with Kitchen, accepts a basic A2A task, and appears in Flow with declared capabilities.
- **D-28:** The proof should validate the ADK path without requiring all developers to run a production ADK service during normal Kitchen startup.

### the agent's Discretion
- The planner may decide exact route file layout, table names, type module boundaries, and test breakdown after researching the current A2A spec and existing Kitchen route/database patterns.
- The planner may choose whether compatibility aliases for stale `tasks/send` naming are worth including, as long as spec-native A2A methods are primary and tests prove the official names.
- The planner may decide whether A2A task tables live in the main Kitchen SQLite DB or a clearly isolated namespace within it. Phase 36's LangGraph checkpoint DB remains separate per prior decision.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### A2A And ADK Official Sources
- `https://github.com/a2aproject/A2A/blob/main/docs/specification.md` - Official A2A 1.0 specification; source of truth for method names, task lifecycle, agent cards, streaming, auth expectations, and schemas.
- `https://google-a2a.github.io/A2A/specification/` - Rendered A2A specification; useful for quick section navigation.
- `https://adk.dev/a2a/quickstart-consuming/` - Current Google ADK A2A consuming quickstart; confirms ADK's `RemoteA2aAgent`, agent-card URL usage, and `adk api_server --a2a` fixture pattern.

### Roadmap And Requirements
- `.planning/ROADMAP.md` - Phase 35 goal and success criteria. Note: verify method names against current A2A spec before implementing stale roadmap labels.
- `.planning/REQUIREMENTS.md` - A2A-01 through A2A-08 definitions.
- `.planning/STATE.md` - v2.0 carry-forward constraints, especially A2A/LangGraph boundary and separate future LangGraph checkpoint DB.
- `.planning/PROJECT.md` - Product framing: open-source A2A hub and startup-ready agent operations dashboard.
- `.planning/MILESTONE-CONTEXT.md` - Milestone-level A2A-native strategy and framework support framing.

### Phase 34 Foundation
- `.planning/phases/34-universal-rest-api-canonical-agent-registry/34-CONTEXT.md` - Locked Phase 34 decisions: canonical registry service, API-key security, A2A deferred to Phase 35.
- `.planning/phases/34-universal-rest-api-canonical-agent-registry/34-RESEARCH.md` - Registry/service patterns and Phase 35 adapter expectations.
- `.planning/phases/34-universal-rest-api-canonical-agent-registry/34-VERIFICATION.md` - Proof that canonical registry and REST security are complete.

### Existing Code Integration Points
- `apps/kitchen/src/lib/agent-registry.ts` - Canonical registry service; A2A registration must write through this service.
- `apps/kitchen/src/lib/db-schema.ts` - Additive SQLite schema pattern for new task/discovery tables if needed.
- `apps/kitchen/src/types/index.ts` - Shared registry and agent DTO types to extend or avoid duplicating.
- `apps/kitchen/src/lib/dispatch/build-agent-card.ts` - Existing non-spec-complete agent card builder; likely needs replacement or evolution for Kitchen's own A2A card.
- `apps/kitchen/src/app/api/agents/cards/route.ts` and `apps/kitchen/src/app/api/agents/[id]/card/route.ts` - Existing card read surfaces.
- `apps/kitchen/src/app/api/dispatch/route.ts` - Existing dispatch route and audit/security scanner pattern.
- `apps/kitchen/src/lib/dispatch/*` - Existing adapter pattern for delegating work to agents.
- `apps/kitchen/src/app/agents/page.tsx` and `apps/kitchen/src/components/agents/*` - Registry UI that should display A2A agents after registration.
- `apps/kitchen/src/app/flow/page.tsx` and `apps/kitchen/src/components/flow/react-flow-canvas.tsx` - Flow surfaces that should show registered ADK/A2A agents.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `registerAgent()` in `apps/kitchen/src/lib/agent-registry.ts`: canonical mutation boundary for A2A registration.
- `authenticateAgentHeaders()` and API-key tables: secure foundation for A2A bearer/API-key enforcement.
- `recordHeartbeat()` and `pollRemoteAgent()`: liveness patterns that can inform A2A remote health checks.
- `writeAuditLog()` and `scanContent()` in dispatch route: existing security/audit patterns for task submission.
- Dispatch adapter interfaces in `apps/kitchen/src/lib/dispatch/types.ts`: useful model for delegating tasks without embedding every remote protocol directly in route handlers.
- Registry UI and Flow registry roster from Phase 34: A2A agents should appear automatically when stored as registered agents with `protocol: "a2a"`.

### Established Patterns
- Next.js route handlers use `dynamic = "force-dynamic"` for live operational surfaces.
- Tests use Vitest route/service coverage with temp SQLite via `SQLITE_DB_PATH`.
- SQLite migrations are additive in `db-schema.ts` and use the shared `better-sqlite3` singleton.
- Existing live dashboard panels mostly use React Query polling; Phase 35 SSE should be limited to A2A streaming endpoints, not used as a blanket dashboard architecture change.
- Project security posture forbids `execSync`/`exec`; use HTTP and safe Node/Python process handling only where absolutely needed.

### Integration Points
- `/.well-known/agent.json` should be added as a public well-known route for Kitchen's own A2A card.
- A2A JSON-RPC routes should connect to durable task state and registry-backed identity.
- A2A discovery/registration should connect agent cards to `registered_agents` and `agent_capabilities`.
- Delegation should bridge A2A task objects to existing/future dispatch adapters while preserving trace IDs.
- The ADK fixture should be isolated so it proves compatibility without becoming required production infrastructure.
</code_context>

<specifics>
## Specific Ideas

- Prefer private-network/Tailscale/LAN examples for startup internal use, while accepting properly secured HTTPS URLs for agents hosted elsewhere.
- Treat the roadmap's `tasks/send` label as a stale compatibility concern; research must verify current A2A 1.0 method mapping before planning.
- Agent cards should declare the same security scheme the implementation enforces; do not publish `authentication: none` for protected task endpoints.
- A2A registration should store original agent-card metadata in registry metadata for debugging and future docs.
- Task state should include at least task ID, context/correlation ID, authenticated caller, target agent, status, timestamps, request payload/metadata, and final result/artifacts enough for `tasks/get`.
</specifics>

<deferred>
## Deferred Ideas

- OAuth/OIDC, SSO, and enterprise identity provider support are deferred beyond Phase 35.
- Full LangGraph routing, retry policy, HIL, and orchestration persistence are deferred to Phase 36.
- Resumable SSE stream backfill is deferred unless current A2A spec compliance requires it.
- Public integration guides and polished docs are deferred to Phase 40, though Phase 35 should leave runnable examples and route contracts behind.
- Docker/service startup packaging for ADK and multi-machine examples is deferred to Phases 38-39 unless a minimal fixture script is needed for tests.
</deferred>

---

*Phase: 35-A2A Protocol Implementation + Google ADK Support*
*Context gathered: 2026-05-05*
