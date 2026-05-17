# Phase 35: A2A Protocol Implementation + Google ADK Support - Research

**Phase:** 35-a2a-protocol-implementation-google-adk-support  
**Date:** 2026-05-05  
**Goal:** Research what is needed to plan Phase 35 well: standards-compatible A2A support, Google ADK proof, secure multi-machine deployment, and integration with the Phase 34 canonical registry.

## Executive Summary

Phase 35 should implement Memroos as a standards-first A2A hub using the current official Agent2Agent protocol, not the stale roadmap wording. The current A2A specification separates data model, operations, and protocol bindings. Its core operations are send message, send streaming message, get task, list tasks, cancel task, subscribe to task, and get agent card. The HTTP+JSON binding uses `POST /message:send`, `POST /message:stream`, `GET /tasks/{id}`, `GET /tasks`, `POST /tasks/{id}:cancel`, and `POST /tasks/{id}:subscribe`. JSON-RPC is also a standard binding; the official spec currently describes JSON-RPC 2.0 over HTTP(S) with SSE for streaming.

Memroos should avoid inventing a new A2A-like protocol. The Phase 35 plan should add a small A2A module with spec-shaped types, an agent-card builder, task-store/service functions, route handlers, and an A2A client/delegation adapter. A2A registration should ingest a remote agent card and write into the Phase 34 canonical registry via `registerAgent({ protocol: "a2a" })`. Task state should be durable in SQLite so multi-machine agents can disconnect and still use task lookup. Security should reuse Phase 34 bearer/API-key identity while declaring the same scheme in Memroos's agent card.

## Official Source Findings

### A2A specification

Sources:
- `https://github.com/a2aproject/A2A/blob/main/docs/specification.md`
- `https://a2a-protocol.org/v0.2.6/specification/`
- `https://github.com/a2aproject/A2A/blob/main/specification/a2a.proto`

Key findings:
- The spec is layered: canonical data model (`Task`, `Message`, `AgentCard`, `Part`, `Artifact`, `Extension`), protocol operations, and bindings.
- Current operations include send message, send streaming message, get task, list tasks, cancel task, subscribe to task, and get agent card.
- HTTP+JSON URL patterns currently include:
  - `POST /message:send`
  - `POST /message:stream`
  - `GET /tasks/{id}`
  - `GET /tasks`
  - `POST /tasks/{id}:cancel`
  - `POST /tasks/{id}:subscribe`
- The roadmap phrase `tasks/send` is stale. Plans must use spec-native method names and may include compatibility aliases only if they are explicitly deprecated and non-canonical.
- Streaming uses Server-Sent Events. For a task lifecycle stream, the stream begins with a task object and may emit status/artifact update events until terminal state.
- The spec states servers must reject invalid/missing auth and must enforce authorization boundaries. Missing auth and insufficient permission are distinct semantics, and implementations should not leak resource existence when the caller is unauthorized.
- Agent cards are discovered at `.well-known/agent-card.json` in the current spec. The existing roadmap says `/.well-known/agent.json`; Phase 35 plans should either update Memroos to the current well-known path as canonical or provide both with the current path canonical.
- Agent cards must not include credentials or sensitive internal details.
- The current spec includes security objects for API key, HTTP auth, OAuth2, and OpenID Connect. Phase 35 can declare HTTP bearer/API key auth without implementing OAuth.
- A2A version negotiation uses the `A2A-Version` header in HTTP contexts. Plans should include version handling or at least tests for unsupported versions if the binding requires it.

### Google ADK A2A behavior

Sources:
- `https://adk.dev/a2a/quickstart-consuming/`
- `https://google.github.io/adk-docs/a2a/intro/`
- `https://google.github.io/adk-docs/runtime/api-server/`

Key findings:
- ADK distinguishes local sub-agents from remote A2A agents. A2A is the right choice when an agent is an independent service communicating over the network.
- ADK Python can expose an agent with `adk api_server --a2a --port 8001 <agents_dir>`.
- ADK's consuming quickstart uses a remote agent with an `agent-card.json` and a URL like `http://localhost:8001/a2a/check_prime_agent`.
- ADK has `RemoteA2aAgent` for consuming remote A2A agents from an agent-card URL.
- A runnable ADK proof for Memroos should not require every developer to run a production ADK service, but should document or fixture the `adk api_server --a2a` path and include a testable sample card/task flow.

### Official JavaScript SDK

Source:
- `https://github.com/a2aproject/a2a-js`

Key findings:
- The official JS SDK supports server and client concepts, authenticated fetch integration, JSON-RPC transport factories, and SSE streaming task updates.
- The SDK may be useful for conformance or test fixtures, but Phase 35 should not blindly adopt it without checking dependency cost and Next.js/Turbopack compatibility.
- If the SDK is not adopted, use its examples as validation references for event shapes and streaming behavior.

## Existing Memroos Foundation

### Registry and identity

Relevant files:
- `apps/memroos/src/lib/agent-registry.ts`
- `apps/memroos/src/lib/db-schema.ts`
- `apps/memroos/src/types/index.ts`
- `apps/memroos/src/app/agents/page.tsx`
- `apps/memroos/src/components/agents/*`

Phase 34 gives Phase 35 a strong base:
- `registerAgent()` can create/upsert canonical agents and capabilities.
- `authenticateAgentHeaders()` validates bearer keys and returns canonical agent identity.
- API keys are hashed in `agent_api_keys`; plaintext is returned only on creation.
- Registered agents include protocol, capabilities, remote metadata, liveness, metadata, and soft deregistration.
- Registry UI and Flow already source canonical registered agents, so A2A agents should appear automatically after registration if the registry record is correct.

Recommended extension:
- Do not create a separate A2A registry.
- Store A2A-specific values in `registered_agents.metadata` at first: original agent card URL, endpoint URL, A2A version, security scheme, input/output modes, original card snapshot, validation status.
- Add explicit columns only if planning determines they are core query fields needed by routes/UI.

### Existing agent card and dispatch surfaces

Relevant files:
- `apps/memroos/src/lib/dispatch/build-agent-card.ts`
- `apps/memroos/src/app/api/agents/cards/route.ts`
- `apps/memroos/src/app/api/agents/[id]/card/route.ts`
- `apps/memroos/src/app/api/dispatch/route.ts`
- `apps/memroos/src/lib/dispatch/*`

Current `build-agent-card.ts` is useful as an early adapter but is not spec-complete:
- It returns `version: "1"` and `authentication.schemes: ["none"]`, which conflicts with Phase 35's secure bearer/API-key goal.
- It builds cards for registered remote agents, not Memroos's own public A2A card.
- It may use older field names (`authentication`) while current A2A card security objects need verification against the official schema.

`/api/dispatch` already has useful patterns:
- Validates body, checks target agent, scans content, writes audit logs, persists delegation/action rows, and selects an adapter.
- Phase 35 should not directly mutate this route into A2A. Better: introduce A2A task services and optionally bridge to existing dispatch adapters for outbound delegation.

### Database patterns

Relevant files:
- `apps/memroos/src/lib/db-schema.ts`
- `apps/memroos/src/lib/db.ts`
- `apps/memroos/src/lib/__tests__/agent-registry.test.ts`

Recommended tables for Phase 35:
- `a2a_tasks`: task ID, context/correlation ID, caller agent ID, target agent ID, state, message/history JSON, artifacts JSON, metadata JSON, created/updated/terminal timestamps, cancel requested timestamp.
- `a2a_task_events`: task ID, sequence, event kind, payload JSON, created timestamp; supports streaming and debugging.
- `a2a_agent_cards` or registry metadata: original card URL, endpoint URL, card hash/snapshot, validation status, last fetched timestamp. If no new table is needed, store this in registry metadata and test it.

Important: Phase 36 LangGraph checkpoint DB remains separate (`data/orchestration.db`). A2A task state is transport-level state and can live in Memroos's main SQLite DB unless planning finds a concrete lock-contention issue.

## Recommended Architecture

### 1. A2A type and validation module

Create a focused module, for example:
- `apps/memroos/src/lib/a2a/types.ts`
- `apps/memroos/src/lib/a2a/validation.ts`
- `apps/memroos/src/lib/a2a/errors.ts`

Responsibilities:
- Define the subset of A2A types Memroos supports in Phase 35, aligned to the current spec.
- Validate inbound messages/tasks/agent cards without accepting arbitrary shapes.
- Map Memroos errors to A2A/HTTP or JSON-RPC errors.
- Keep types close to source references so future spec updates are isolated.

Planning caution:
- Verify whether Memroos will implement the HTTP+JSON REST binding, JSON-RPC binding, or both. The context says spec-compatible A2A 1.0 and mentions JSON-RPC task/message routes; the current spec supports both. Given ADK sample URLs and current spec, the plan should research the ADK server's concrete binding and choose the binding that maximizes interoperability.

### 2. Memroos's own agent card

Create `/.well-known/agent-card.json` as canonical. Consider also exposing `/.well-known/agent.json` as a compatibility alias if roadmap/tests expect it, but avoid documenting it as primary.

The card should include:
- name, description, version
- base A2A endpoint URL
- capabilities, including streaming true if `message/stream` is supported
- input/output modes
- skills/capabilities Memroos exposes
- security scheme matching bearer/API-key enforcement
- no secrets or local-only internals

### 3. Agent-card ingestion and registration adapter

Add an endpoint/service to ingest a remote A2A agent card URL:
- Validate URL scheme and SSRF protections before fetch.
- Fetch with short timeout and size limit.
- Validate required card fields.
- Normalize skills to `RegisteredAgentCapability[]`.
- Determine agent ID deterministically from card identity plus URL when needed.
- Call `registerAgent()` with `protocol: "a2a"`.
- Store card URL, endpoint URL, card snapshot/hash, supported version, security scheme, input/output modes, and validation result in metadata.

Security concern:
- Fetching arbitrary remote URLs is SSRF-prone. For startup use, allow private-network URLs only when explicitly configured or when running locally, and document the default. At minimum block loopback/link-local/private ranges only if public registration is exposed to untrusted users. Because Memroos is single-user local today, planner can choose a pragmatic SSRF guard with tests for obviously dangerous schemes (`file:`, `ftp:`, metadata IPs).

### 4. Durable A2A task service

Create a service module, for example:
- `apps/memroos/src/lib/a2a/task-store.ts`
- `apps/memroos/src/lib/a2a/task-service.ts`

Responsibilities:
- Create/get/list/cancel tasks.
- Append task events for status/artifact updates.
- Enforce caller authorization using authenticated agent identity.
- Preserve `messageId` for idempotency where possible.
- Preserve context/correlation ID for Phase 36 lineage.
- Return not-found or not-authorized without leaking existence.

### 5. Message send and streaming routes

Depending on binding choice:
- HTTP+JSON: `POST /message:send`, `POST /message:stream`, `GET /tasks/[id]`, `GET /tasks`, `POST /tasks/[id]:cancel`, optionally `POST /tasks/[id]:subscribe`.
- JSON-RPC: one A2A endpoint whose `method` dispatches to `message/send`, `message/stream`, `tasks/get`, etc., or PascalCase names if the current spec/SDK requires that binding.

The planner must verify exact method names and ADK compatibility before writing plan tasks.

Streaming:
- Use SSE `text/event-stream`.
- Stream initial task/message event, then status/artifact updates.
- Close when terminal.
- `tasks/get` remains the reliability fallback.

### 6. Delegation to remote A2A agents

Add an A2A client adapter that can send tasks to a registered A2A agent endpoint:
- Resolve target agent from registry.
- Read endpoint URL/card metadata.
- Attach outbound auth if the remote card declares it and credentials are configured.
- Convert Memroos task/message to A2A message/task request.
- Persist outbound status/result/artifacts.

Phase 35 can keep routing simple:
- Explicit target agent support is required.
- Capability-based selection can be minimal: find active agents with matching declared capability, choose deterministic first/best candidate, and log why.
- Full routing policy belongs to Phase 36.

### 7. Google ADK proof

Recommended proof path:
- Add a sample fixture under a clearly optional path such as `examples/adk-a2a-agent/` or `services/adk-a2a-fixture/`.
- Include a static valid `agent-card.json` fixture for route/service tests.
- Include README or script instructions for `pip install google-adk[a2a]` and `adk api_server --a2a --port 8001 ...`.
- Add tests that ingest an ADK-shaped card, create a registry record with `protocol: "a2a"`, and confirm the Flow registry data path receives it.
- If feasible, add an integration test with a mocked ADK A2A server rather than requiring ADK runtime in normal CI.

## Validation Architecture

Phase 35 needs layered validation because it touches standards compliance, security, persistence, remote network behavior, and UI surfacing.

### Unit tests

- A2A type/validation helpers reject malformed agent cards, malformed messages, unsupported versions, missing message parts, and invalid task IDs.
- Agent-card builder emits the required fields, declares the enforced security scheme, and never leaks secrets.
- Agent-card ingestion normalizes capabilities and writes to `registerAgent()` with `protocol: "a2a"`.
- Task store persists tasks/events and handles terminal states.
- Authorization helpers reject identity spoofing and unauthorized task lookup/cancel.

### Route tests

- `GET /.well-known/agent-card.json` returns a valid Memroos card.
- Optional `GET /.well-known/agent.json` alias either returns the same card or redirects if compatibility is planned.
- Unauthenticated A2A send/get/cancel requests fail.
- Authenticated `message/send` creates or updates durable task state.
- `message/stream` returns SSE events and closes on terminal state.
- `tasks/get` returns current/final state for authorized callers.
- `tasks/cancel` is idempotent and handles terminal/non-cancelable tasks correctly.
- Agent-card registration route rejects bad URLs/cards and accepts a valid ADK-shaped card.

### Integration tests

- Mock remote A2A agent receives delegated task and Memroos persists outbound result.
- ADK-shaped fixture card registers, appears in `/api/agents`, and Flow data transforms include it.
- Multi-machine assumptions are covered with non-localhost URLs in tests, not just `localhost`.

### Static/spec checks

- Grep or snapshot should ensure no canonical `tasks/send` implementation is introduced unless marked compatibility-only.
- Method/route mapping tests should cite the official A2A method names.
- Build and lint remain required.

### Manual smoke test

- Start Memroos.
- Start or mock an ADK A2A server on another port or private-network URL.
- Register the ADK agent card.
- Confirm the agent appears in Agent Registry and Flow.
- Send an A2A message, watch stream events, fetch final task with task lookup, and test cancel on an active task.

## Threat Model Notes For Plans

Every Phase 35 plan should include a threat model. Important threats:
- SSRF during agent-card ingestion from arbitrary URLs.
- Auth bypass or trusting body-provided agent IDs instead of bearer-authenticated identity.
- Task information disclosure across agents through `tasks/get` or list routes.
- Publishing an agent card that claims `authentication: none` while endpoints require auth, or vice versa.
- Secret leakage in agent-card metadata, task history, artifacts, audit logs, or test fixtures.
- Streaming endpoints that never close or leak events to unauthorized callers.
- Replay/duplicate send requests when `messageId` idempotency is ignored.
- Remote agent delegation to stale/deregistered agents.
- Overbuilding Phase 36 orchestration inside Phase 35.

## Open Questions For Planner

1. Which binding should Memroos implement first for best ADK interoperability: HTTP+JSON REST, JSON-RPC, or both behind a common service?
2. Should `/.well-known/agent-card.json` be canonical with `/.well-known/agent.json` as alias for roadmap compatibility?
3. Should A2A task state use new main DB tables or a distinct file? Recommendation: main DB tables for transport task state; keep LangGraph checkpoint DB separate.
4. Should the official `@a2a-js/sdk` be adopted or used only as a reference/test dependency? Planner should evaluate package maturity, dependency footprint, and Next.js compatibility.
5. What is the minimal ADK fixture that proves compatibility without making ADK a required CI dependency?

## Recommended Plan Slices

1. **A2A spec foundation and Memroos agent card**: types, validation, errors, well-known card route, auth scheme declaration.
2. **A2A registration/discovery adapter**: remote card ingestion, SSRF-safe fetch, canonical registry write, ADK-shaped fixture registration.
3. **Durable task API and streaming**: task tables/service, send/get/list/cancel, SSE streaming, auth/authorization tests.
4. **Delegation and ADK proof surfaced in UI**: A2A client adapter, delegation to registered A2A agent, fixture/mock ADK server, Flow/Registry proof.

This sequencing lets Phase 36 build LangGraph routing on a stable transport/task layer without revisiting registry or protocol basics.
