import { MEM0_URL } from "@/lib/constants";
import type { MemoryTier } from "./tiers";

export interface MemoryTierHealth {
  tier: MemoryTier;
  backend: string;
  status: "up" | "down" | "not_configured";
  detail?: string;
  count?: number | null;
  lastWrite?: string | null;
}

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export function neo4jConfig() {
  return {
    url: (process.env.NEO4J_HTTP_URL || "http://localhost:7474").replace(/\/$/, ""),
    database: process.env.NEO4J_DATABASE || "neo4j",
    username: process.env.NEO4J_USERNAME || "neo4j",
    password: process.env.NEO4J_PASSWORD || "",
  };
}

export async function searchVectorMemory(query: string, limit: number) {
  const params = new URLSearchParams({ q: query || "recent", agent_id: "luis", limit: String(limit) });
  const response = await fetch(`${MEM0_URL}/memory/search?${params}`, { signal: timeoutSignal(5000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.detail === "string" ? result.detail : "Vector memory backend unavailable";
    throw new Error(detail);
  }
  return result;
}

export async function queryGraphMemory(query: string, limit: number) {
  const config = neo4jConfig();
  if (!config.password) throw new Error("Neo4j password is not configured");

  const cypher = query
    ? `MATCH (n)
       WHERE toLower(coalesce(n.name, n.title, n.id, '')) CONTAINS $q
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN properties(n) AS node, collect(DISTINCT type(r)) AS relationships, collect(DISTINCT properties(m)) AS neighbors
       LIMIT $limit`
    : `MATCH (n)
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN properties(n) AS node, collect(DISTINCT type(r)) AS relationships, collect(DISTINCT properties(m)) AS neighbors
       LIMIT $limit`;

  const response = await fetch(`${config.url}/db/${encodeURIComponent(config.database)}/tx/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
    },
    body: JSON.stringify({ statements: [{ statement: cypher, parameters: { q: query.toLowerCase(), limit } }] }),
    signal: timeoutSignal(5000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || (Array.isArray(result.errors) && result.errors.length > 0)) {
    throw new Error("Graph memory backend unavailable");
  }
  return result;
}

export async function checkVectorHealth(): Promise<MemoryTierHealth> {
  try {
    const response = await fetch(`${MEM0_URL}/health`, { signal: timeoutSignal(3000) });
    return { tier: "vector", backend: "mem0-qdrant", status: response.ok ? "up" : "down" };
  } catch (error) {
    return { tier: "vector", backend: "mem0-qdrant", status: "down", detail: error instanceof Error ? error.message : undefined };
  }
}

export async function checkGraphHealth(): Promise<MemoryTierHealth> {
  const config = neo4jConfig();
  if (!config.password) return { tier: "graph", backend: "neo4j", status: "not_configured" };
  try {
    await queryGraphMemory("", 1);
    return { tier: "graph", backend: "neo4j", status: "up" };
  } catch (error) {
    return { tier: "graph", backend: "neo4j", status: "down", detail: error instanceof Error ? error.message : undefined };
  }
}
