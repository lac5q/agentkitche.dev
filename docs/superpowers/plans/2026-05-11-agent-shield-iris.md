# Agent Shield + Iris Security Layer

**Date:** 2026-05-11
**Status:** Phase 2 implemented
**Owner:** Alba
**Source:** Luis suggestion in Discord #agent_kitchen

## Problem

MemroOS' current security scanner (`content-scanner.ts`) covers ~18 regex patterns for secrets, PII, and basic injection. It is a useful first line but has gaps:

- Regex-only: no semantic understanding of prompt injection patterns
- No MCP server / tool permission auditing
- No agent configuration vulnerability scanning
- No visibility of scan results in the Kitchen UI
- No pre-flight/post-execution security gate on dispatch

## What is Agent Shield

[affaan-m/agentshield](https://github.com/affaan-m/agentshield) is an open-source AI agent security scanner (MIT license, 128 commits) that provides:

- `.claude/` directory vulnerability scanning
- MCP server and tool permission auditing
- Prompt injection detection (beyond regex)
- Tool misuse analysis
- CLI, GitHub Action, and API interfaces
- Dashboard for scan results

This is the most mature open-source agent security tool in the space.

## What is Iris

"Iris" is the proposed name for the **secure dispatch gate** in MemroOS — a watchdog layer that sits between task dispatch and agent execution:

1. **Pre-flight:** Scan incoming task prompts for injection, jailbreak, and tool-misuse patterns before dispatch
2. **In-flight:** Validate tool calls and agent permissions against the registry before execution
3. **Post-execution:** Scan agent output for secrets, PII, and injection payloads before returning to caller

Iris wraps the existing `content-scanner.ts` and adds Agent Shield's deeper analysis as a structured security plane.

## Architecture

```
MemroOS (existing)                Iris (new)
┌──────────────────┐              ┌──────────────────────┐
│  Dispatch UI     │──dispatch──▶│  Pre-flight Scanner  │
│  A2A Broker      │              │  (prompt injection)  │
│  REST Shim       │              └──────────┬───────────┘
└──────────────────┘                         │
                                    ┌────────▼───────────┐
                                    │  Tool Call Guard   │
                                    │  (permission check)│
                                    └────────┬───────────┘
                                             │
                                    ┌────────▼───────────┐
                                    │  Post-exec Scanner │
                                    │  (output sanitise) │
                                    └────────┬───────────┘
                                             │
                                    ┌────────▼───────────┐
                                    │  Audit Log         │
                                    │  (visible in UI)   │
                                    └────────────────────┘
```

## Phase 1 Results: Agent Shield Scan (completed 2026-05-11)

### Kitchen scan: Grade C (72/100)
- 4 files scanned, 22 findings (2 critical, 5 high, 12 medium, 1 low, 2 info)
- **Critical:** CLAUDE.md missing instruction boundary + data leakage defenses
- **High:** Suspicious instruction in CLAUDE.md gitnexus comment, missing role/indirect/harmful defenses, no deny list in settings
- **Medium:** Shell metacharacters in `.cursor/mcp.json` MCP server args, MCP servers inherit full env (no explicit env block), missing prompt defenses for unicode/context-overflow/social-engineering
- **Secrets: 100/100** — no hardcoded secrets found
- **Hooks: 100/100** — no dangerous hooks found
- **MCP: 85/100** — env leak + shell metacharacters

### Hermes scan: Grade D (45/100)
- 58 files scanned, 584 findings (83 critical, 158 high, 269 medium)
- Most are false positives from Agent Shield flagging every GSD agent profile for missing OWASP LLM prompt defenses (expected for operational prompts, not security-sensitive agents)
- Real findings: `gsd-executor.md` contains `git push --force` reference, `gsd-debug-session-manager.md` flagged for system prompt references

### Key takeaway
Agent Shield's rule engine catches 5 categories our `content-scanner.ts` doesn't:
1. **Prompt injection defenses** — missing OWASP LLM Top 10 guardrails in CLAUDE.md
2. **Permission auditing** — missing deny lists, no PreToolUse hooks
3. **MCP server risks** — env inheritance, shell metacharacters in args
4. **Agent config vulnerabilities** — hidden instructions in comments, destructive tool refs
5. **Scoring engine** — A-F grade with severity-weighted deductions

This is the real value add: our current scanner is regex-only (secrets/PII/injection). Agent Shield adds structural analysis of agent configs, MCP servers, and prompt security posture.

## Phase 2 Results: Iris pre-flight scanner (completed 2026-05-11)

Implemented a first Iris security gate for dispatch and A2A message creation:

- Added `apps/kitchen/src/lib/iris-scanner.ts`
- Wrapped the existing `scanContent` checks so secrets, PII, and injection regex coverage stays intact
- Added high-severity pre-flight rules for:
  - Direct instruction override attempts
  - System prompt or hidden instruction exfiltration attempts
  - Safety, security, policy, or permission bypass attempts
- Wired Iris into `POST /api/dispatch` before persistence and adapter dispatch
- Wired Iris into `sendA2aMessage` before A2A task persistence
- Preserved existing external semantics:
  - Dispatch still returns `403 CONTENT_BLOCKED`
  - A2A still throws `UNAUTHORIZED` with `Content blocked by security scanner`
  - Audit action remains `content_blocked`

Verification:

- RED tests confirmed missing Iris behavior before implementation
- Targeted Iris/dispatch/A2A tests pass: 21/21
- Existing content scanner tests pass: 16/16
- Full Kitchen test suite passes: 477/477 across 76 files
- ESLint exits 0 with 11 pre-existing warnings
- Production build passes. One existing Turbopack NFT trace warning remains in `next.config.ts` via `/api/apo`
- GitNexus change detection reports HIGH risk due expected A2A blast radius around `sendA2aMessage`

## Implementation Phases

### Phase 1: Agent Shield evaluation
- Clone and run agentshield locally against the Kitchen codebase
- Audit what it catches that `content-scanner.ts` misses
- Decide: integrate as dependency vs fork/adapt patterns

### Phase 2: Iris pre-flight scanner
- Add prompt injection detection to dispatch/A2A routes
- Wrap existing `scanContent` with richer analysis
- Block or flag suspicious tasks before they reach agents

### Phase 3: Tool call guard
- Validate tool calls against agent registry permissions
- Reject out-of-scope tool usage

## Phase 3 Results: Tool permission guard (implemented locally 2026-05-11)

Added a first registry-backed policy guard:

- Added `apps/kitchen/src/lib/security-policy.ts`
- Dispatch policy:
  - Allows legacy targets with no declared capabilities for backward compatibility
  - Denies targets that declare capabilities but do not include a dispatch-compatible capability
  - Enforces operating-profile private-network blocking through existing A2A config
- A2A task policy:
  - Denies callers that declare capabilities but do not include an A2A send-compatible capability
  - Blocks before A2A task persistence
- Memory write policy:
  - Denies tier writes outside declared memory capabilities, e.g. `memory:write:episodic` cannot write `graph`
  - Blocks before mem0 calls and before `agent_memory_writes` persistence
- Audit semantics:
  - Denials write `policy_denied` audit rows
  - External responses use `403 POLICY_DENIED` or A2A `UNAUTHORIZED` without exposing secrets

Verification:

- Targeted policy tests: 28/28 passed
- Affected A2A/dispatch/memory suites: 68/68 passed
- Full Kitchen tests: 485/485 passed
- `npm run lint`: exits 0 with 11 pre-existing warnings
- `npm run build`: passes with the existing `/api/apo` Turbopack NFT warning

### Phase 4: Audit UI
- Show scan results, blocked attempts, and security events in Kitchen UI
- New `/security` or `/iris` page with scan history

### Phase 5: Progressive capability
- Expose as `capability:agent-shield` in progressive discovery
- Configurable per-agent: strict, standard, or permissive mode

## Current Content Scanner Coverage

| Pattern | Severity | Coverage |
|---------|----------|----------|
| AWS keys | HIGH | Regex |
| GitHub tokens | HIGH | Regex |
| PEM private keys | HIGH | Regex |
| JWT tokens | HIGH | Regex |
| Credit cards | HIGH | Regex |
| SSN | HIGH | Regex |
| Password in URL | HIGH | Regex |
| Slack webhooks | HIGH | Regex |
| XSS script tags | HIGH | Regex |
| Shell injection | HIGH | Regex |
| Email | MEDIUM | Regex |
| Phone | MEDIUM | Regex |
| Generic secrets | MEDIUM | Regex |
| Long tokens | MEDIUM | Regex |
| SQL injection | MEDIUM | Regex |

Gaps: prompt injection (semantic), jailbreak patterns, tool misuse, MCP permission drift, agent config vulnerabilities.

## Notes

- Agent Shield is MIT licensed and remains compatible as a third-party dependency under the current project license
- Iris name chosen to be distinct from existing "Iris" products (Spot AI camera agent, Delinea identity security)
- The existing `content-scanner.ts` should be enhanced, not replaced — it works and is integrated into dispatch/hive routes
