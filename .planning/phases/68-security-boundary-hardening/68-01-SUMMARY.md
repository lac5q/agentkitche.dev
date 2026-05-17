---
phase: 68
plan: 01
title: Security Boundary Hardening
status: complete
completed: 2026-05-17
requirements: [SECBOUND-01, SECBOUND-02, SECBOUND-03, SECBOUND-04, SECBOUND-05, SECBOUND-06, SECBOUND-07, SECBOUND-08]
---

# Phase 68 Plan 01 — Security Boundary Hardening: Summary

## Outcome

The May 2026 boundary gaps are closed in the highest-risk paths. Onboarding
invites now require route-local operator/admin authorization, dispatch derives
the actor from authenticated context instead of trusting the body, long scanner
inputs fail closed, undeclared capabilities are denied outside local-dev
compatibility, web security headers are applied globally, auth endpoints have
basic throttling, and private-network A2A remote-card access defaults to deny
outside local/private profiles.

## What Was Done

- Added route-local auth to `/api/onboarding/invite`; operator key or
  operator/admin session required.
- Added `/api/onboarding/invite` to proxy operator-route coverage.
- Hardened `/api/dispatch` actor derivation; `from_agent` is no longer accepted
  from request body as policy/audit authority.
- Changed `scanContent()` long-input behavior from skip to fail-closed
  `input_too_long` block.
- Disabled legacy undeclared capability allow mode outside local-dev unless an
  explicit compatibility env var enables it.
- Changed A2A private-network remote-card default to allow only local-dev and
  private-network profiles.
- Added global CSP/X-Frame/X-Content-Type/Referrer/Permissions headers in proxy.
- Added in-memory login/refresh rate limiting.

## Verification

- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/__tests__/content-scanner.test.ts src/lib/__tests__/security-policy.test.ts src/lib/a2a/__tests__/agent-card.test.ts src/app/api/dispatch/__tests__/route.test.ts src/app/api/onboarding/__tests__/route.test.ts --run`
  - 5 files, 55 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/auth/__tests__/rate-limit.test.ts --run`
  - 1 file, 2 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run typecheck`
  - passed

## Notes

- Local-dev compatibility remains available by default for undeclared legacy
  agents. Non-local profiles deny by default unless
  `MEMROOS_ALLOW_LEGACY_UNDECLARED_CAPABILITIES=true` is explicitly set.
- CSP currently includes development allowances for inline/eval and localhost
  connections because this app still runs Next dev/local tooling paths.
