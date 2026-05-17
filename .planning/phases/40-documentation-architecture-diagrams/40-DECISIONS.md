# Phase 40 Decisions: Documentation + Architecture

## Choices Made

1. **Park Rust rebuild discussion for v3.**
   Why: Phase 40 documents the v2 system that exists today. Rust is a useful future architecture question, but adding it to v2 docs would blur current install and integration guidance.

2. **Make private-network the recommended startup deployment.**
   Why: The product goal is multiple agents on different machines with practical security. Tailscale/LAN plus bearer/operator auth is the best default before public HTTPS.

3. **Document A2A as preferred and REST as compatibility shim.**
   Why: A2A is the standards-aligned path for compatible frameworks. REST keeps CrewAI, AutoGen, and custom agents productive without forcing protocol work first.

4. **Explicitly distinguish canonical registry from legacy remote config.**
   Why: `/agents` shows only DB-backed canonical agents. Older `agents.config.json` entries must be registered or ingested before they become canonical.

5. **Keep LangGraph as an orchestration boundary, not a Memroos replacement.**
   Why: Memroos should remain a durable thin broker/operator UI while the Python service owns graph execution and checkpoints.
