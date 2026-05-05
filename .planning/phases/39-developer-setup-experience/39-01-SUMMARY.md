---
phase: 39-developer-setup-experience
plan: 01
subsystem: setup
status: complete
requirements_addressed: [DEV-01, DEV-02, PROFILE-01, PROFILE-02, PROFILE-04]
---

# Phase 39 Summary: Setup + First-Run Wizard

## What Landed

- Added `scripts/first-run-wizard.mjs` for guided profile/API-key/env setup.
- Added `npm run first-run:check` for deterministic validation.
- Integrated `./setup.sh --wizard` as the guided entrypoint.
- Wizard respects `ENV_FILE` so custom installs can generate non-default env files.
- `setup.sh` detects Node, npm, Python, Docker, and Docker Compose.
- `setup.sh` scaffolds env from `.env.example`, validates profiles, validates Qdrant Cloud by default, and can start compose.
- Wizard validates profile, Qdrant URL/API key, Neo4j password, and operator API key.

## Verification

- `npm run first-run:check` — passed.
- `bash -n setup.sh` — passed.
- Phase 38 setup smoke still passes with `START_SERVICES=0 SKIP_QDRANT_CHECK=1`.

## Residual Notes

- Wizard prepares first-agent setup guidance but does not auto-register an agent because credential minting should happen against the operator's real running Kitchen instance.
