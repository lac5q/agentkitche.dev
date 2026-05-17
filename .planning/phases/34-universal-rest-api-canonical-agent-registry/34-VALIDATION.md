# Phase 34: Validation Strategy

**Created:** 2026-05-05
**Phase:** 34-universal-rest-api-canonical-agent-registry

## Validation Architecture

Phase 34 passes only when the registry model is canonical, the REST write endpoints are authenticated, and user-facing rosters read from the registry.

## Required Checks

### Service Tests

- `apps/memroos/src/lib/__tests__/agent-registry.test.ts`
- Cover register/upsert, list/get, deregister, API key hash/verify, heartbeat status derivation, capability persistence, and compatibility DTO mapping.

### Route Tests

- `/api/agents/register`: returns a public agent and one-time API key.
- `/api/agents`: lists canonical registered agents.
- `/api/agents/[id]`: deregisters without hard-deleting audit history.
- `/api/heartbeat`: rejects missing/invalid bearer key, accepts valid key, updates last heartbeat.
- `/api/skills/report`: rejects missing/invalid bearer key, accepts valid report.
- `/api/memory/add`: rejects missing/invalid bearer key, forwards valid writes to mem0, records audit.
- `/api/tool-attention/record`: rejects missing/invalid bearer key, appends valid outcomes, records audit.

### UI Tests

- Agent Registry page renders registered agents with capabilities, status, last heartbeat, and protocol type.
- Register form calls the registration API and shows/captures one-time key behavior without leaking key into normal list DTOs.
- Deregister action removes or marks the agent inactive in the UI.

### Static And Integration Checks

- `rg -n "KEY_AGENT_IDS|AGENT_ICONS|alba|gwen|sophia|maria|lucia" apps/memroos/src/components/flow apps/memroos/src/app/flow apps/memroos/src/app/page.tsx`
- Expected: no hardcoded agent roster identifiers remain in Flow/Memroos roster construction.
- Curl-like flow: register agent, POST heartbeat with returned key, GET `/api/agents`, confirm the agent appears active.

## Final Verification Commands

```bash
npm --prefix apps/memroos run test
npm --prefix apps/memroos run lint
npm --prefix apps/memroos run build
rg -n "KEY_AGENT_IDS|AGENT_ICONS" apps/memroos/src/components/flow apps/memroos/src/app/flow
```

## Acceptance Criteria

- REST-01..REST-06 are covered by route or integration tests.
- REG-00..REG-03 are covered by service, route, and UI tests.
- All REST write endpoints fail closed on missing or invalid agent API keys.
- Registry page and Flow both source agent roster data from the canonical registry.
- No plaintext API keys are stored in SQLite or returned by normal list/get endpoints.
