# Phase 37 Decisions: Unified Memory

## Choices Made

1. **Keep mem0 as the vector/search facade.**
   Why: Phase 23/34 already use mem0, and v2.0 fixed the memory stack as mem0 + Qdrant Cloud + Neo4j + SQLite. Memroos should not write directly to Qdrant.

2. **Route writes by explicit tier.**
   Why: `type`/`metadata.tier` is auditable and avoids surprising heuristics. Legacy aliases map to stable tiers: `semantic/fact -> vector`, `relationship/entity -> graph`, `event/conversation/note -> episodic`.

3. **Use Neo4j HTTP transaction API for Memroos graph reads.**
   Why: It avoids adding a Node driver before Phase 38 Docker/profile work and works well for read-only graph inspection with parameterized Cypher.

4. **Treat Qdrant as cloud-only.**
   Why: This preserves the existing architectural constraint. Docker/setup should validate `QDRANT_URL` and `QDRANT_API_KEY`, not launch local Qdrant.

5. **Show tier health in the existing Memory Intelligence panel.**
   Why: This satisfies MEM-05 without creating another page or visual system.

## Security Notes

- Graph query route does not accept raw Cypher. It accepts `q` and `limit`, then sends parameterized Cypher to Neo4j.
- Neo4j credentials live only in server-side memory backend config and are not exported from client-imported constants.
- Agent writes still require Phase 34 per-agent bearer/API-key authentication.
