"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeCollection } from "@/types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1.5 inline-flex">
      <span
        aria-label="More information"
        className="inline-flex items-center text-slate-600 transition-colors hover:text-slate-400"
        role="img"
      >
        <Info size={12} />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-100 px-3 py-1.5 text-xs leading-snug text-slate-950 shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

interface HealthPanelProps {
  collections: KnowledgeCollection[];
  totalFiles: number;
}

export function HealthPanel({ collections, totalFiles }: HealthPanelProps) {
  // eslint-disable-next-line react-hooks/purity -- intentional: freshness check at render time
  const now = Date.now();

  const coverageGaps = collections.filter((c) => c.docCount < 10);
  const freshnessAlerts = collections.filter((c) => {
    if (!c.lastUpdated) return true;
    return now - new Date(c.lastUpdated).getTime() > THIRTY_DAYS_MS;
  });
  const avgSize =
    collections.length > 0 ? Math.round(totalFiles / collections.length) : 0;

  const meetingsCollection = collections.find((c) => c.name === "meet-recordings");

  return (
    <div className="flex flex-col gap-4">
        {/* Meetings tracking indicator */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    meetingsCollection ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                <span className="text-xs font-medium text-slate-300">
                  Meeting + Call Recordings
                </span>
                <InfoTip text="The 'meet-recordings' QMD collection. Green = Google Meet transcripts and exported Apple Notes call recordings are indexed and searchable. Grey = collection not found — add .md, .mdx, or .txt files to ~/github/knowledge/gdrive/meet-recordings/ or ~/github/knowledge/apple-notes/call-recordings/." />
              </div>
              {meetingsCollection ? (
                <span className="text-xs font-semibold text-emerald-400">
                  {meetingsCollection.docCount} files indexed
                </span>
              ) : (
                <span className="text-xs text-slate-600">not found</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Coverage Gaps */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-semibold text-amber-400">
                Coverage Gaps
                <InfoTip text="Collections with fewer than 10 files. Thin collections may not have enough context to answer questions reliably. Source: QMD live file count per configured collection folder." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coverageGaps.length === 0 ? (
                <p className="text-xs text-slate-500">All collections look healthy.</p>
              ) : (
                <ul className="space-y-1.5">
                  {coverageGaps.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between rounded-md bg-amber-500/10 px-2.5 py-1.5"
                    >
                      <span className="truncate text-xs text-amber-200">{c.name}</span>
                      <span className="ml-2 shrink-0 text-xs font-semibold text-amber-400">
                        {c.docCount} files
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Freshness Alerts */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-semibold text-rose-400">
                Freshness Alerts
                <InfoTip text="Collections not updated in 30+ days. Staleness is measured by the most recent file modification time (mtime) sampled across up to 5 files per collection." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {freshnessAlerts.length === 0 ? (
                <p className="text-xs text-slate-500">All collections are up to date.</p>
              ) : (
                <ul className="space-y-1.5">
                  {freshnessAlerts.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between rounded-md bg-rose-500/10 px-2.5 py-1.5"
                    >
                      <span className="truncate text-xs text-rose-200">{c.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-rose-400">
                        {c.lastUpdated
                          ? `${Math.floor(
                              (now - new Date(c.lastUpdated).getTime()) /
                                (24 * 60 * 60 * 1000)
                            )}d ago`
                          : "never"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats summary */}
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {totalFiles.toLocaleString()}
                </p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                  Knowledge Files
                  <InfoTip text="Sum of all .md, .mdx, and .txt files across every configured QMD collection. Counted live from disk on each page load — not cached. Conversation memories are shown separately below." />
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {collections.length}
                </p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                  Collections
                  <InfoTip text="Number of configured collection folders under ~/github/knowledge/. These are knowledge file stores, separate from conversation memory entries." />
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {avgSize.toLocaleString()}
                </p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                  Avg Size
                  <InfoTip text="Knowledge Files ÷ Collections. A low average means many thin, sparse collections. Aim for 50+ files per collection for reliable retrieval." />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
