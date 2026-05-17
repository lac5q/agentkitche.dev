---
phase: 66
name: Self-hosted Hardening + Compliance Posture
created: 2026-05-17
source: ROADMAP v3.0
---

# Phase 66 Context: Self-hosted Hardening + Compliance Posture

## Product Intent

Memroos should be credible for self-hosted and regulated deployments. Operators
need a clear data-residency mode, local judge model configuration, a compose
stack that does not require external data egress, and admin controls for users,
API keys, audit retention, and adapter enablement.

## Dependencies

- Phase 63: authenticated users, roles, and API keys.
- Phase 64: immutable audit and HIL records.
- Prior infrastructure phases: setup, compose, Qdrant/Neo4j/mem0 profiles.

## Requirements

- INFRA-01: self-hosted compose/profile posture supports local services.
- INFRA-02: data-residency mode forces local model endpoints and prevents
  external model calls.

## Decisions

1. Data-residency mode is a runtime guard, not documentation-only policy.
2. Ollama/vLLM judge endpoints use an OpenAI-compatible interface where
   possible to avoid provider-specific branches.
3. Admin controls should be additive and backed by existing RBAC.
4. Compose defaults remain safe for OSS users while Luis's local native workflow
   remains supported.

## Verification Contract

- Unit-test provider routing under data-residency mode.
- Verify local judge config produces deterministic W-compatible output in tests.
- Verify admin APIs enforce admin authorization and write audit evidence.
- Run compose/setup validation in a no-services smoke mode where full local
  containers are too expensive for the session.
