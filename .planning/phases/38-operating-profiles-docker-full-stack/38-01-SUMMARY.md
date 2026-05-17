---
phase: 38-operating-profiles-docker-full-stack
plan: 01
subsystem: infra
status: complete
requirements_addressed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, PROFILE-01, PROFILE-02, PROFILE-03, PROFILE-04]
---

# Phase 38 Summary: Profiles + Docker Full Stack

## What Landed

- Added `config/operating-profiles.json` with default/customizable profiles.
- Added `scripts/validate-operating-profiles.mjs` and `npm run profiles:check`.
- Added `docker-compose.yml` for Memroos, mem0, Neo4j, voice, knowledge MCP, and orchestration.
- Added Dockerfiles for Memroos, memory, voice, knowledge MCP, and orchestration.
- Added missing service requirement files for mem0 and knowledge MCP containers.
- Added env coverage for ports, Qdrant Cloud, Neo4j, orchestration, and voice.
- Updated voice service ports to read from env.
- Added `setup.sh` prereq checks, env scaffolding, profile validation, Qdrant Cloud validation, and compose startup.

## Verification

- `npm run profiles:check` — passed.
- `docker compose config --quiet` with required env values — passed.
- `bash -n setup.sh` — passed.
- `START_SERVICES=0 SKIP_QDRANT_CHECK=1 ENV_FILE=<tmp> ./setup.sh` — passed.

## Residual Notes

- Compose syntax is verified, but images were not built in this slice to keep runtime bounded.
- Phase 39 should add a friendlier first-run wizard flow on top of `setup.sh`.
