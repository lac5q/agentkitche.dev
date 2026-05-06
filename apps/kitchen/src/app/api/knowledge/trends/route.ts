import type { NextRequest } from "next/server";
import {
  collectKnowledgeFiles,
  loadCollections,
  resolveCollectionPath,
} from "@/lib/knowledge-collections";
import type { KnowledgeCollection } from "@/types";

export const dynamic = "force-dynamic";

const VALID_WINDOWS = ["day", "week", "month"] as const;
type TrendWindow = (typeof VALID_WINDOWS)[number];

interface TrendPoint {
  bucket: string;
  value: number;
  cumulative: number;
}

interface BucketConfig {
  since: Date;
  buckets: string[];
  bucketFor: (date: Date) => string;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hourKey(date: Date) {
  return `${date.toISOString().slice(0, 13)}:00`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addHours(date: Date, hours: number) {
  const copy = new Date(date);
  copy.setUTCHours(copy.getUTCHours() + hours, 0, 0, 0);
  return copy;
}

function getBucketConfig(window: TrendWindow): BucketConfig {
  const now = new Date();
  if (window === "day") {
    const start = new Date(now);
    start.setUTCHours(start.getUTCHours() - 23, 0, 0, 0);
    return {
      since: start,
      buckets: Array.from({ length: 24 }, (_, index) => hourKey(addHours(start, index))),
      bucketFor: hourKey,
    };
  }

  const days = window === "week" ? 7 : 30;
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    since: start,
    buckets: Array.from({ length: days }, (_, index) => dateKey(addDays(start, index))),
    bucketFor: dateKey,
  };
}

function parseWindow(value: string | null): TrendWindow | null {
  return VALID_WINDOWS.includes(value as TrendWindow) ? (value as TrendWindow) : null;
}

function parseLimit(value: string | null) {
  const parsed = Number(value ?? "12");
  if (!Number.isFinite(parsed)) return 12;
  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function buildPoints(bucketConfig: BucketConfig, mtimes: Date[]): TrendPoint[] {
  const counts = new Map(bucketConfig.buckets.map((bucket) => [bucket, 0]));
  for (const mtime of mtimes) {
    if (mtime < bucketConfig.since) continue;
    const bucket = bucketConfig.bucketFor(mtime);
    if (!counts.has(bucket)) continue;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  let cumulative = 0;
  return bucketConfig.buckets.map((bucket) => {
    const value = counts.get(bucket) ?? 0;
    cumulative += value;
    return { bucket, value, cumulative };
  });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  const window = parseWindow(url.searchParams.get("window"));
  if (!window) return Response.json({ error: "Invalid window" }, { status: 400 });

  const limit = parseLimit(url.searchParams.get("limit"));
  const bucketConfig = getBucketConfig(window);
  const collections = loadCollections();
  const trends: Array<{
    name: string;
    category: KnowledgeCollection["category"];
    totalFiles: number;
    recentFiles: number;
    lastUpdated: string | null;
    points: TrendPoint[];
  }> = [];

  for (const collection of collections) {
    try {
      const files = await collectKnowledgeFiles(resolveCollectionPath(collection));
      const mtimes = files.map((file) => file.mtime);
      const points = buildPoints(bucketConfig, mtimes);
      const lastUpdated = mtimes.reduce<Date | null>(
        (latest, mtime) => (!latest || mtime > latest ? mtime : latest),
        null
      );
      trends.push({
        name: collection.name,
        category: collection.category,
        totalFiles: files.length,
        recentFiles: points.reduce((sum, point) => sum + point.value, 0),
        lastUpdated: lastUpdated?.toISOString() ?? null,
        points,
      });
    } catch {
      trends.push({
        name: collection.name,
        category: collection.category,
        totalFiles: 0,
        recentFiles: 0,
        lastUpdated: null,
        points: buildPoints(bucketConfig, []),
      });
    }
  }

  trends.sort((a, b) => b.recentFiles - a.recentFiles || b.totalFiles - a.totalFiles);

  return Response.json({
    collections: trends.slice(0, limit),
    window,
    buckets: bucketConfig.buckets,
    timestamp: new Date().toISOString(),
  });
}
