import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface RuntimeMemoryInput {
  content: string;
  tags?: string[];
  ttlDays?: number;
  createdAt?: string;
}

export interface RuntimeMemory {
  id: string;
  content: string;
  tags: string[];
  ttlDays: number;
  mergeCount: number;
  createdAt: string;
  updatedAt: string;
  score?: number;
}

export interface MemoryToolInput {
  action: "add" | "replace" | "remove";
  target?: string;
  content?: string;
  id?: string;
}

const SYNONYMS: Record<string, string[]> = {
  configure: ["config", "configuration", "settings", "env", "provider"],
  models: ["model", "provider", "routing"],
  tests: ["experiment", "experiments", "ab", "a/b"],
  account: ["customer", "buyer", "crm"],
  bug: ["incident", "error", "fix"],
};

function memoryDir(root: string): string {
  return path.join(root, "memory", "v2");
}

function storePath(root: string): string {
  return path.join(memoryDir(root), "memories.json");
}

function archiveDir(root: string): string {
  return path.join(root, "memory", "archive");
}

function ensureStore(root: string): void {
  fs.mkdirSync(memoryDir(root), { recursive: true });
  fs.mkdirSync(archiveDir(root), { recursive: true });
  if (!fs.existsSync(storePath(root))) fs.writeFileSync(storePath(root), "[]");
}

function readStore(root: string): RuntimeMemory[] {
  ensureStore(root);
  try {
    return JSON.parse(fs.readFileSync(storePath(root), "utf8")) as RuntimeMemory[];
  } catch {
    return [];
  }
}

function writeStore(root: string, memories: RuntimeMemory[]): void {
  ensureStore(root);
  fs.writeFileSync(storePath(root), JSON.stringify(memories, null, 2));
}

function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .replace(/a\/b/g, "ab")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const expanded = new Set<string>();
  for (const token of base) {
    expanded.add(token);
    for (const [canonical, variants] of Object.entries(SYNONYMS)) {
      if (token === canonical || variants.includes(token)) {
        expanded.add(canonical);
        variants.forEach((variant) => expanded.add(variant));
      }
    }
  }
  return Array.from(expanded);
}

function cosine(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((token) => setB.has(token)).length;
  if (setA.size === 0 || setB.size === 0) return 0;
  return intersection / Math.sqrt(setA.size * setB.size);
}

function idFor(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function addMemory(root: string, input: RuntimeMemoryInput): RuntimeMemory {
  const memories = readStore(root);
  const tokens = tokenize(input.content);
  const duplicate = memories.find((memory) => cosine(tokens, tokenize(memory.content)) > 0.9);
  const now = new Date().toISOString();
  if (duplicate) {
    duplicate.content = Array.from(new Set([duplicate.content, input.content])).join("\n");
    duplicate.tags = Array.from(new Set([...duplicate.tags, ...(input.tags ?? [])]));
    duplicate.mergeCount += 1;
    duplicate.updatedAt = now;
    writeStore(root, memories);
    return duplicate;
  }

  const memory: RuntimeMemory = {
    id: idFor(`${input.content}:${now}`),
    content: input.content,
    tags: input.tags ?? [],
    ttlDays: input.ttlDays ?? 90,
    mergeCount: 1,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
  memories.push(memory);
  writeStore(root, memories);
  return memory;
}

export function searchMemories(root: string, query: string, options: { limit?: number; threshold?: number } = {}): RuntimeMemory[] {
  const limit = options.limit ?? 5;
  const threshold = options.threshold ?? 0.5;
  const queryTokens = tokenize(query);
  return readStore(root)
    .map((memory) => ({
      ...memory,
      score: Number(cosine(queryTokens, tokenize(`${memory.content} ${memory.tags.join(" ")}`)).toFixed(3)),
    }))
    .filter((memory) => (memory.score ?? 0) >= threshold)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

export function buildContextInjection(root: string, topic: string, options: { maxChars?: number; limit?: number } = {}) {
  const maxChars = options.maxChars ?? 1500;
  const memories = searchMemories(root, topic, { limit: options.limit ?? 10, threshold: 0.5 });
  let text = "";
  const injected: RuntimeMemory[] = [];
  for (const memory of memories) {
    const next = `${text ? "\n" : ""}- ${memory.content}`;
    if (next.length > maxChars) break;
    text = next;
    injected.push(memory);
  }
  return { text, memories: injected };
}

export function purgeExpiredMemories(root: string, now = new Date()) {
  const memories = readStore(root);
  const keep: RuntimeMemory[] = [];
  const archived: string[] = [];
  for (const memory of memories) {
    if (memory.ttlDays === 0) {
      keep.push(memory);
      continue;
    }
    const expiresAt = new Date(memory.createdAt).getTime() + memory.ttlDays * 86_400_000;
    if (expiresAt <= now.getTime()) {
      archived.push(memory.id);
      fs.writeFileSync(path.join(archiveDir(root), `${memory.id}.json`), JSON.stringify(memory, null, 2));
    } else {
      keep.push(memory);
    }
  }
  writeStore(root, keep);
  return { archived };
}

export function memoryTool(root: string, input: MemoryToolInput) {
  if (input.action === "add") {
    if (!input.content) return { ok: false, error: "content is required" };
    return { ok: true, memory: addMemory(root, { content: input.content }) };
  }
  if (input.action === "remove") {
    const memories = readStore(root).filter((memory) => memory.id !== input.id);
    writeStore(root, memories);
    return { ok: true };
  }
  if (input.action === "replace") {
    if (!input.id || !input.content) return { ok: false, error: "id and content are required" };
    const memories = readStore(root).map((memory) =>
      memory.id === input.id ? { ...memory, content: input.content ?? memory.content, updatedAt: new Date().toISOString() } : memory
    );
    writeStore(root, memories);
    return { ok: true };
  }
  return { ok: false, error: "unsupported action" };
}
