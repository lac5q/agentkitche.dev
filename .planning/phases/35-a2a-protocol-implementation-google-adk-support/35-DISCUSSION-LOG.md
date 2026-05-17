# Phase 35: A2A Protocol Implementation + Google ADK Support - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 35-A2A Protocol Implementation + Google ADK Support
**Areas discussed:** Spec Compatibility, Registration Shape, Task Ownership, Streaming Behavior, Security Model, Google ADK Proof, Multi-Machine Startup Use Case

---

## Spec Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Official A2A 1.0 only | Follow current A2A method names and schemas, even where roadmap wording is stale. | ✓ |
| Roadmap names | Preserve `tasks/send` as canonical because roadmap mentioned it. | |
| Dual canonical methods | Treat stale and current names equally. | |

**User's choice:** User guessed we should follow A2A.
**Notes:** Web verification found current A2A 1.0 uses `message/send` and `message/stream` for send/stream operations, with `tasks/get` and `tasks/cancel` for task lifecycle. Context locks spec-native names as primary.

---

## Registration Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Agent-card ingestion into canonical registry | Fetch/receive an A2A agent card, validate it, normalize capabilities, and call Phase 34 `registerAgent()`. | ✓ |
| Custom register RPC | Invent a Memroos-specific A2A registration method as the primary registration model. | |
| Manual UI only | Require users to type A2A agent records manually. | |

**User's choice:** User asked for recommendation.
**Notes:** Recommended agent-card ingestion because A2A's discovery primitive is the agent card and Phase 34 already established one canonical registry service.

---

## Task Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Durable thin broker | Memroos persists task state, enforces auth, exposes A2A methods, and delegates, while Phase 36 owns routing intelligence. | ✓ |
| Execute everything in Memroos | Memroos directly fulfills all A2A tasks first. | |
| Full orchestrator now | Build LangGraph-style routing/retry/HIL in Phase 35. | |

**User's choice:** User asked for recommendation.
**Notes:** Recommended durable thin broker because Phase 36 owns LangGraph routing, retry, and HIL. User later clarified startup multi-machine use, making durable task state non-negotiable.

---

## Streaming Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Live SSE plus polling fallback | Stream connected progress and rely on task lookup for current/final state after disconnect. | ✓ |
| Resumable stream backfill | Store and replay all missed stream events in Phase 35. | |
| Polling only | Skip A2A streaming in Phase 35. | |

**User's choice:** User asked for recommendation.
**Notes:** Recommended live SSE plus `tasks/get` fallback. Multi-machine use means task lookup reliability matters more than fancy stream replay.

---

## Security Model

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 34 bearer/API keys | Reuse hashed per-agent keys, revocation, authenticated identity, authorization checks, and declare API-key auth in agent card. | ✓ |
| No auth for local network | Trust LAN/Tailscale and skip machine auth. | |
| OAuth/OIDC now | Add enterprise identity provider support in Phase 35. | |

**User's choice:** "Use a secure model here but don't overcomplicate."
**Notes:** Recommended reusing Phase 34 bearer keys with stricter request authorization and audit logs. OAuth/OIDC is deferred but interfaces should remain extensible.

---

## Google ADK Proof

| Option | Description | Selected |
|--------|-------------|----------|
| Runnable local/LAN fixture | Include a small ADK-style A2A sample that exposes a card, registers, accepts a task, and appears in Flow. | ✓ |
| Docs-only proof | Document that ADK should work but do not run it. | |
| Production ADK service | Build and ship a full production ADK service as part of Memroos startup. | |

**User's choice:** "No idea"; accepted recommendation.
**Notes:** Recommended executable proof without making ADK a required production dependency.

---

## Multi-Machine Startup Use Case

| Option | Description | Selected |
|--------|-------------|----------|
| Localhost demo | Optimize for one-machine development only. | |
| Private network only | Assume Tailscale/LAN/VPN only. | |
| Both, private recommended | Support private network and secured HTTPS, with private-network examples as safest startup default. | ✓ |

**User's choice:** User clarified the product goal: use in a startup with multiple agents on different machines, support that use case, security, standards, and proven methods.
**Notes:** This strengthened registration validation, durable task state, per-agent auth, and real remote/LAN ADK proof expectations. It did not require reworking Phase 34.

---

## the agent's Discretion

- Exact route layout and schema/table names.
- Whether stale `tasks/send` aliases are worth including as compatibility-only helpers.
- Exact ADK fixture shape, as long as it is executable and does not become required production infrastructure.
- Whether A2A task state lives in new tables in the main Memroos DB or another clearly justified location; Phase 36 LangGraph checkpoint DB remains separate.

## Deferred Ideas

- OAuth/OIDC and enterprise SSO.
- Full LangGraph orchestration brain.
- Resumable SSE backfill unless required by the current A2A spec.
- Public docs polish and Docker/setup packaging.
