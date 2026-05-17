# Phase 36 Decisions: LangGraph Orchestration Service

Date: 2026-05-05
Status: recommended defaults selected for implementation

## Choices Made

1. Separate Python service, not embedded in Next.js.
Why: LangGraph is Python-first for this phase, and prior project state explicitly says LangGraph should follow the Pipecat voice-service pattern. This avoids cross-process SQLite lock contention with Memroos's main DB.

2. Dedicated checkpoint DB at `data/orchestration.db`.
Why: LangGraph persistence docs require checkpointers for human-in-the-loop resume and fault tolerance. Keeping checkpoints in a separate DB preserves the Phase 36 architectural constraint.

3. Memroos remains the control plane and UI proxy.
Why: Memroos already owns registry, auth, A2A transport, and Flow UI. The orchestration service owns routing policy, retry, HIL state, and lineage. This preserves ORCH-07.

4. Capability routing is deterministic first-match with status preference.
Why: Phase 36 requires capability routing but not a full policy brain. Deterministic selection is debuggable, testable, and safe to replace with richer policy later.

5. HIL is approve/reject only.
Why: v2.0 scope explicitly excludes edit-and-continue semantics. Reject marks the orchestration failed; approve resumes the queued dispatch path.

6. Retry default is 2 attempts.
Why: Enough to prove retry semantics without surprising operators or hiding repeated failures. Operators can tune it later through `ORCHESTRATION_RETRY_LIMIT`.

7. A2A remains the execution transport.
Why: Phase 35 completed A2A task transport. LangGraph should choose the agent and ask Memroos/A2A to dispatch rather than reimplementing A2A.

## Official Docs Consulted

- LangGraph persistence docs: https://docs.langchain.com/oss/python/langgraph/persistence
- LangGraph interrupt reference: https://reference.langchain.com/python/langgraph.types/interrupt
- LangGraph SqliteSaver reference: https://reference.langchain.com/python/langgraph.checkpoint.sqlite/SqliteSaver
