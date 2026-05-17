import type { KnowledgeCollection } from "@/types";
import {
  loadCollections,
  scanConfiguredCollection,
} from "@/lib/knowledge-collections";

export const dynamic = "force-dynamic";

export async function GET() {
  const COLLECTIONS = loadCollections();
  const collections: KnowledgeCollection[] = [];

  for (const col of COLLECTIONS) {
    try {
      const { docCount, lastUpdated } = await scanConfiguredCollection(col);
      collections.push({
        name: col.name,
        docCount,
        category: col.category,
        lastUpdated: lastUpdated?.toISOString() || null,
      });
    } catch {
      collections.push({
        name: col.name,
        docCount: 0,
        category: col.category,
        lastUpdated: null,
      });
    }
  }

  const totalFiles = collections.reduce((sum, c) => sum + c.docCount, 0);

  return Response.json({
    collections: collections.sort((a, b) => b.docCount - a.docCount),
    totalDocs: totalFiles,
    totalFiles,
    totalCollections: collections.length,
    timestamp: new Date().toISOString(),
  });
}
