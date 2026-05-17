---
phase: 68
name: Security Boundary Hardening
status: planned
created: 2026-05-16
---

# Phase 68 Context: Security Boundary Hardening

## Why This Exists

The May 2026 security review found that the project has meaningful defense layers already, but several sensitive paths still rely on broad proxy checks, compatibility defaults, or partial prompt-injection coverage. This phase turns those findings into explicit product requirements before Memoroos is positioned as a compliance-ready platform.

## Source Findings

1. Onboarding invite route-local auth gap
   - `apps/kitchen/src/app/api/onboarding/invite/route.ts` creates signed onboarding tokens and accepts requested capabilities.
   - The route should require operator/admin authorization inside the handler, not only generic `/api/*` proxy auth.
   - `apps/kitchen/src/proxy.ts` should classify this endpoint with operator-only routes.

2. Dispatch route-local auth gap
   - `apps/kitchen/src/app/api/dispatch/route.ts` accepts a client-supplied `from_agent`.
   - That value participates in audit/policy decisions and should be derived from authenticated user or agent identity.
   - The handler should explicitly authorize either an operator user or an authenticated agent with dispatch permission.

3. Long-input scanner bypass
   - `apps/kitchen/src/lib/content-scanner.ts` allows content over its scanner limit without scanning.
   - Payloads over 4096 characters must be chunk-scanned or rejected fail-closed.

4. Partial Iris prompt-injection coverage
   - `apps/kitchen/src/lib/iris-scanner.ts` currently uses regex rules for obvious instruction override, system prompt exfiltration, and tool-policy bypass patterns.
   - Current callers cover dispatch and A2A send, but the target state is every agent-facing free-text task ingress.

5. Capability compatibility default
   - `apps/kitchen/src/lib/security-policy.ts` uses `allowLegacyWhenUndeclared()` for dispatch, A2A send, and memory write paths.
   - Production and non-local profiles should deny undeclared sensitive capabilities by default.

6. Missing visible web-security hardening
   - Checked files did not show a global CSP/security-header configuration.
   - Login/refresh endpoints need abuse throttling distinct from public trace API throttling.

7. A2A private-network default
   - `apps/kitchen/src/lib/a2a/config.ts` defaults remote-card private-network allowance permissively.
   - Production-safe behavior should deny private-network remote-card fetches unless a local-dev/private-network profile explicitly enables them.

## Requirement Mapping

- SECBOUND-01: onboarding invite authorization
- SECBOUND-02: dispatch authorization and actor derivation
- SECBOUND-03: strict capability policy defaults
- SECBOUND-04: prompt-injection ingress coverage
- SECBOUND-05: long-input scanner hardening
- SECBOUND-06: web security headers
- SECBOUND-07: auth endpoint abuse protection
- SECBOUND-08: remote-card network policy

## Dependencies

- Phase 63 must provide stable user identity and roles.
- Phase 64 must provide append-only audit events for blocked/flagged security decisions.
