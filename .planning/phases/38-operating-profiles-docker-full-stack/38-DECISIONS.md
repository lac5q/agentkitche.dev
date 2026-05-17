# Phase 38 Decisions: Operating Profiles + Docker

## Choices Made

1. **Bless `local-dev` as default profile.**
   Why: It works for a first clone while keeping private-network and cloud profiles explicit for startup deployment.

2. **Ship five profile definitions:** `local-dev`, `single-host`, `private-network`, `cloud-https`, and `custom`.
   Why: These match the user requirement for OpenClaw/Hermes-like defaults that operators can customize without forking source.

3. **Docker compose includes six services and no local Qdrant.**
   Why: Qdrant Cloud is a fixed v2.0 architectural constraint. Compose starts Memroos, mem0, Neo4j, voice, knowledge MCP, and orchestration.

4. **Use Neo4j local container for graph tier.**
   Why: Unlike Qdrant, Neo4j is part of the v2.0 local/full-stack runtime.

5. **Keep setup Qdrant validation live by default, skippable only for tests/dev plumbing.**
   Why: Operators should fail fast when cloud vector config is wrong, but CI/tests need a deterministic syntax path.
