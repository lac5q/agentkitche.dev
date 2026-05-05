export type MemoryTier = "vector" | "graph" | "episodic";

const TIER_ALIASES: Record<string, MemoryTier> = {
  vector: "vector",
  semantic: "vector",
  fact: "vector",
  graph: "graph",
  relationship: "graph",
  entity: "graph",
  episodic: "episodic",
  event: "episodic",
  conversation: "episodic",
  note: "episodic",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function resolveMemoryTier(payload: Record<string, unknown>): MemoryTier {
  const explicit = typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  if (explicit && TIER_ALIASES[explicit]) return TIER_ALIASES[explicit];

  const metadata = isRecord(payload.metadata) ? payload.metadata : {};
  const metadataTier = typeof metadata.tier === "string" ? metadata.tier.toLowerCase() : "";
  if (metadataTier && TIER_ALIASES[metadataTier]) return TIER_ALIASES[metadataTier];

  return "episodic";
}

export function buildTieredMemoryPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const tier = resolveMemoryTier(payload);
  const metadata = isRecord(payload.metadata) ? payload.metadata : {};
  return {
    ...payload,
    type: tier,
    metadata: {
      ...metadata,
      tier,
      backend: tier === "graph" ? "mem0-neo4j" : tier === "vector" ? "mem0-qdrant" : "sqlite-episodic",
    },
  };
}
