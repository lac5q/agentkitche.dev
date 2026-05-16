---
title: Second Vertical — Healthcare or Legal
planted_date: 2026-05-16
trigger_condition: "After Phase 65 (finance reconciliation vertical) ships and first external customer is live on Memoroos"
related_phases: [65]
---

# Second Vertical

## Idea

After the finance reconciliation vertical proves the pattern, the second vertical follows:
new adapter + golden sets + UI terminology swap. Candidate verticals:

- **Healthcare**: clinical decision support governance, prior authorization audit trail
- **Legal**: contract review agent, e-discovery compliance log
- **Ops/Logistics**: exception handling, escalation governance for supply chain

## Why this is a seed

The compliance primitives (RBAC, immutable audit, HIL escalation, self-hosted) are built in phases 63-66.
The vertical layer is just an adapter + golden set. But we don't know which vertical has the most pull
until the finance client is live and we can see inbound interest.

## Trigger

Activate this seed when: Phase 65 ships + at least one paying external customer is using the finance vertical.
