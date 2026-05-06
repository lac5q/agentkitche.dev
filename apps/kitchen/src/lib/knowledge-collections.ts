import { readFileSync } from "fs";
import { readdir, stat } from "fs/promises";
import path from "path";
import type { KnowledgeCollection } from "@/types";
import { findConfigFile } from "@/lib/paths";

export type CollectionConfig = {
  name: string;
  category: KnowledgeCollection["category"];
  basePath?: string;
};

export const KNOWLEDGE_FILE_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

export function loadCollections(): CollectionConfig[] {
  const configPath =
    process.env.COLLECTIONS_CONFIG_PATH ||
    findConfigFile("collections.config.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw) as { collections?: CollectionConfig[] };
    return config.collections ?? [];
  } catch {
    return [];
  }
}

export function getKnowledgeBasePath() {
  return (
    process.env.KNOWLEDGE_BASE_PATH ||
    process.env.KNOWLEDGE_HOME ||
    `${process.env.HOME}/github/knowledge`
  );
}

export function resolveCollectionPath(col: { name: string; basePath?: string }) {
  if (!col.basePath) return path.join(getKnowledgeBasePath(), col.name);
  return path.isAbsolute(col.basePath) ? col.basePath : path.join(getKnowledgeBasePath(), col.basePath);
}

export function isKnowledgeFile(filePath: string) {
  return KNOWLEDGE_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export async function collectKnowledgeFiles(collectionPath: string): Promise<Array<{ path: string; mtime: Date }>> {
  const files: Array<{ path: string; mtime: Date }> = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (!entry.isFile() || !isKnowledgeFile(entry.name)) continue;
      const fStat = await stat(entryPath).catch(() => null);
      if (fStat) files.push({ path: entryPath, mtime: fStat.mtime });
    }
  }

  await walk(collectionPath);
  return files;
}

export async function scanCollection(collectionPath: string): Promise<{ docCount: number; lastUpdated: Date | null }> {
  const files = await collectKnowledgeFiles(collectionPath);
  const lastUpdated = files.reduce<Date | null>(
    (latest, file) => (!latest || file.mtime > latest ? file.mtime : latest),
    null
  );
  return { docCount: files.length, lastUpdated };
}
