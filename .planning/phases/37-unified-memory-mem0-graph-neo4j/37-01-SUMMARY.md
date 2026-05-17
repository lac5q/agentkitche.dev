---
phase: 37-unified-memory-mem0-graph-neo4j
plan: 01
subsystem: memory
status: complete
requirements_addressed: [MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, PROFILE-03]
---

# Phase 37 Summary: Unified Memory Tiers

## What Landed

- Added explicit memory tier routing for `vector`, `graph`, and `episodic` writes.
- Updated authenticated `POST /api/memory/add` to normalize tier metadata before forwarding to mem0 and auditing the tier.
- Added `GET /api/memory/search` for vector search via mem0/Qdrant Cloud.
- Added `GET /api/memory/graph` for Neo4j-backed graph reads via parameterized HTTP transaction queries.
- Added `GET /api/memory/health` reporting vector, graph, and episodic tier status.
- Added tier health display to the existing Memory Intelligence panel.
- Added `.env.example` values for Qdrant Cloud and Neo4j.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/memory/__tests__/tiers.test.ts src/app/api/memory/__tests__/tier-routes.test.ts src/app/api/memory/__tests__/add-route.test.ts src/components/ledger/__tests__/memory-intelligence-panel.test.tsx` — passed.

## Residual Notes

- Neo4j is config-driven but Phase 38 still needs Docker/profile wiring to provide a local Neo4j service for OSS users.
- mem0 graph activation depends on the mem0 service being configured with Neo4j credentials in the runtime environment.
