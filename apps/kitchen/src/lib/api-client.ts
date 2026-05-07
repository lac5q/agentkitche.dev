"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_INTERVALS } from "./constants";
import type {
  HealthStatus,
  KnowledgeCollection,
  MemoryEntry,
  ApoCycleStats,
  ApoProposal,
  PaperclipFleetResponse,
  RegisterAgentInput,
  RegisterAgentResult,
  RegisteredAgent,
  SimilarTaskResponse,
  ToolAttentionContextPack,
  ToolAttentionResponse,
} from "@/types";

export interface RegisterA2aAgentCardInput {
  cardUrl: string;
  source?: "adk" | "a2a" | "manual";
  requestedId?: string;
  issueApiKey?: boolean;
}

export interface OrchestrationHilDecision {
  id: string;
  runId: string;
  taskSummary: string;
  selectedAgentId: string | null;
  correlationId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string | null;
}

export interface ResolveOrchestrationHilInput {
  id: string;
  decision: "approve" | "reject";
}

export interface MemoryTierHealth {
  tier: "vector" | "graph" | "episodic";
  backend: string;
  status: "up" | "down" | "not_configured";
  detail?: string;
  count?: number | null;
  lastWrite?: string | null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function mutateJSON<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const detail = typeof body?.error === "string" ? body.error : `${res.status}`;
    throw new Error(`${url}: ${detail}`);
  }
  return res.json();
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () =>
      fetchJSON<{ agents: RegisteredAgent[]; timestamp: string }>("/api/agents"),
    refetchInterval: POLL_INTERVALS.agents,
  });
}

export function useRegisteredAgents() {
  return useAgents();
}

export function registerAgent(input: RegisterAgentInput) {
  return mutateJSON<RegisterAgentResult & { ok: boolean; timestamp: string }>(
    "/api/agents/register",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function registerA2aAgentCard(input: RegisterA2aAgentCardInput) {
  return mutateJSON<RegisterAgentResult & { ok: boolean; timestamp: string }>(
    "/api/a2a/agents/register",
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function deregisterAgent(agentId: string) {
  return mutateJSON<{ ok: boolean; agent: RegisteredAgent; timestamp: string }>(
    `/api/agents/${encodeURIComponent(agentId)}`,
    { method: "DELETE" }
  );
}

export function useRegisterAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useRegisterA2aAgentCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerA2aAgentCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useDeregisterAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deregisterAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useTokenStats() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: () =>
      fetchJSON<{ stats: Record<string, unknown>; timestamp: string }>(
        "/api/tokens"
      ),
    refetchInterval: POLL_INTERVALS.tokens,
  });
}

export function useModelUsage() {
  return useQuery({
    queryKey: ["model-usage"],
    queryFn: () =>
      fetchJSON<{ usage: import("@/lib/parsers").ModelUsage; timestamp: string }>(
        "/api/model-usage"
      ),
    refetchInterval: POLL_INTERVALS.tokens,
  });
}

export function useMemory(source?: string, query?: string) {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (query) params.set("q", query);
  return useQuery({
    queryKey: ["memory", source, query],
    queryFn: () =>
      fetchJSON<{
        claude?: MemoryEntry[];
        mem0?: unknown;
        timestamp: string;
      }>(`/api/memory?${params}`),
    refetchInterval: POLL_INTERVALS.memory,
  });
}

export function useKnowledge() {
  return useQuery({
    queryKey: ["knowledge"],
    queryFn: () =>
      fetchJSON<{
        collections: KnowledgeCollection[];
        totalDocs: number;
        totalFiles: number;
        totalCollections: number;
        timestamp: string;
      }>("/api/knowledge"),
    refetchInterval: POLL_INTERVALS.knowledge,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () =>
      fetchJSON<{ services: HealthStatus[]; timestamp: string }>("/api/health"),
    refetchInterval: POLL_INTERVALS.health,
  });
}

export function useRemoteAgents() {
  return useQuery({
    queryKey: ["remote-agents"],
    queryFn: () =>
      fetchJSON<{
        agents: Array<{
          id: string;
          name: string;
          role: string;
          platform: string;
          location: string;
          host: string;
          port: number;
          status: string;
          latencyMs: number | null;
          healthData: Record<string, unknown> | null;
        }>;
        timestamp: string;
      }>("/api/remote-agents"),
    refetchInterval: POLL_INTERVALS.health,
  });
}

export function useGitNexus() {
  return useQuery({
    queryKey: ["gitnexus"],
    queryFn: () => fetchJSON<{
      repos: Array<{
        name: string;
        path: string;
        files: number;
        symbols: number;
        edges: number;
        clusters: number;
        processes: number;
        lastIndexed: string | null;
      }>;
      timestamp: string;
    }>("/api/gitnexus"),
    refetchInterval: 60000,
  });
}

export function useApo() {
  return useQuery({
    queryKey: ["apo"],
    queryFn: () =>
      fetchJSON<{
        proposals: ApoProposal[];
        stats: ApoCycleStats;
        timestamp: string;
      }>("/api/apo"),
    refetchInterval: 30000, // 30s
  });
}

export function approveApoProposal(proposalId: string) {
  return mutateJSON<{
    ok: boolean;
    proposalId: string;
    skillId: string;
    executorCli: string;
    queued: boolean;
    workerCommand: string;
    approvedAt: string;
  }>("/api/apo", {
    method: "POST",
    body: JSON.stringify({ action: "approve", proposalId }),
  });
}

export function useApproveApoProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveApoProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apo"] });
    },
  });
}

export function useDevToolsStatus() {
  return useQuery({
    queryKey: ["devtools-status"],
    queryFn: () =>
      fetchJSON<{
        tools: Array<{
          id: string;
          name: string;
          mem0: "connected" | "partial" | "not-wired";
          qmd: "connected" | "partial" | "not-wired";
          overall: "connected" | "partial" | "not-wired";
        }>;
        mem0Reachable: boolean;
        timestamp: string;
      }>("/api/devtools-status"),
    refetchInterval: 30000,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchJSON<{
      events: Array<{
        id: string;
        timestamp: string;
        node: string;
        type: string;
        message: string;
        severity: string;
      }>;
      nodeActivity: Record<string, number>;
      timestamp: string;
    }>("/api/activity"),
    refetchInterval: 15000, // refresh every 15s
  });
}

export function useOrchestrationHil() {
  return useQuery({
    queryKey: ["orchestration-hil"],
    queryFn: () =>
      fetchJSON<{
        decisions: OrchestrationHilDecision[];
        timestamp: string;
      }>("/api/orchestration/hil"),
    refetchInterval: 10000,
    retry: false,
  });
}

export function resolveOrchestrationHil(input: ResolveOrchestrationHilInput) {
  return mutateJSON<OrchestrationHilDecision & { ok: boolean; resumed?: boolean; timestamp: string }>(
    `/api/orchestration/hil/${encodeURIComponent(input.id)}`,
    { method: "POST", body: JSON.stringify({ decision: input.decision }) }
  );
}

export function useResolveOrchestrationHilMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveOrchestrationHil,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchestration-hil"] });
    },
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () =>
      fetchJSON<{
        totalSkills: number;
        allSkills: string[];
        contributedByHermes: number;
        contributedByGwen: number;
        recentContributions: Array<{
          skill: string;
          contributor: string;
          timestamp: string;
          action: string;
        }>;
        lastPruned: string | null;
        staleCandidates: number;
        coverageGaps: string[];
        coverageTelemetryStatus: "tracked" | "untracked";
        lastUpdated: string | null;
        failuresByAgent: Record<string, number>;
        failuresByErrorType: Record<string, number>;
        contributionHistory: Array<{ skill: string; date: string; count: number }>;
        skillBudget: {
          status: "ok" | "watch" | "over";
          budgetTokens: number;
          metadataTokens: number;
          metadataChars: number;
          utilization: number;
          totalSkills: number;
          uniqueSkills: number;
          duplicateSkills: string[];
          averageDescriptionChars: number;
          longestDescriptions: Array<{ name: string; chars: number; sourceId: string }>;
          sources: Array<{
            id: string;
            path: string;
            type: "runtime" | "source" | "plugin" | "configured";
            skillCount: number;
            metadataChars: number;
            averageDescriptionChars: number;
          }>;
          recommendations: string[];
        };
        timestamp: string;
      }>("/api/skills"),
    refetchInterval: POLL_INTERVALS.skills,
  });
}

export function useToolAttention(query?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  return useQuery({
    queryKey: ["tool-attention", query],
    queryFn: () =>
      fetchJSON<ToolAttentionResponse>(`/api/tool-attention?${params}`),
    refetchInterval: 30000,
  });
}

export function useSimilarTaskRecommendations(context: ToolAttentionContextPack = {}) {
  const params = new URLSearchParams();
  if (context.task_type) params.set("task_type", context.task_type);
  if (context.repo) params.set("repo", context.repo);
  if (context.agent_id) params.set("agent_id", context.agent_id);
  if (context.tags?.length) params.set("tags", context.tags.join(","));
  return useQuery({
    queryKey: ["tool-attention-similar", context],
    queryFn: () =>
      fetchJSON<SimilarTaskResponse>(`/api/tool-attention/similar?${params}`),
    refetchInterval: 60000,
  });
}

export function useRecallStats() {
  return useQuery({
    queryKey: ["recall-stats"],
    queryFn: () =>
      fetchJSON<{
        rowCount: number;
        lastIngest: string | null;
        lastRecallQuery: string | null;
        dbSizeBytes: number;
        timestamp: string;
      }>("/api/recall/stats"),
    // No auto-refresh — manual via "Run Ingest" button
  });
}

export function useHiveFeed(limit = 20) {
  return useQuery({
    queryKey: ["hive-feed"],
    queryFn: () =>
      fetchJSON<{
        actions: Array<{
          id: number;
          agent_id: string;
          action_type: string;
          summary: string;
          artifacts: string | null;
          timestamp: string;
        }>;
        timestamp: string;
      }>(`/api/hive?limit=${limit}`),
    refetchInterval: POLL_INTERVALS.hive,
  });
}

export function usePaperclipFleet() {
  return useQuery({
    queryKey: ["paperclip-fleet"],
    queryFn: () => fetchJSON<PaperclipFleetResponse>("/api/paperclip"),
    refetchInterval: POLL_INTERVALS.paperclip,
  });
}

export function useAgentPeers(windowMinutes = 60) {
  return useQuery({
    queryKey: ["agent-peers", windowMinutes],
    queryFn: () =>
      fetchJSON<{
        peers: Array<{
          agent_id: string;
          current_task: string;
          status: string;
          last_seen: string;
        }>;
        window_minutes: number;
        timestamp: string;
      }>(`/api/agent-peers?window=${windowMinutes}`),
    refetchInterval: POLL_INTERVALS.hive, // 5000ms -- same as hive feed
  });
}

export function useAuditLog(limit = 20) {
  return useQuery({
    queryKey: ["audit-log", limit],
    queryFn: () =>
      fetchJSON<{
        entries: Array<{
          id: number;
          actor: string;
          action: string;
          target: string;
          detail: string | null;
          severity: string;
          timestamp: string;
        }>;
        timestamp: string;
      }>(`/api/audit-log?limit=${limit}`),
    refetchInterval: POLL_INTERVALS.hive,
  });
}

export function useVoiceStatus() {
  return useQuery({
    queryKey: ["voice-status"],
    queryFn: () => fetchJSON<{
      active: boolean;
      session_id: string | null;
      started_at: string | null;
      duration_secs: number | null;
      error?: string;
    }>("/api/voice-status"),
    refetchInterval: POLL_INTERVALS.voice,
  });
}

export function useMemoryStats() {
  return useQuery({
    queryKey: ["memory-stats"],
    queryFn: () =>
      fetchJSON<{
        lastRun: {
          completed_at: string;
          batch_size: number;
          insights_written: number;
          status: string;
        } | null;
        pendingUnconsolidated: number;
        tierStats: Array<{
          tier: string;
          count: number;
          avg_score: number;
        }>;
        consolidationModel: string;
        sources: Array<{ agent_id: string; cnt: number }>;
        timestamp: string;
      }>("/api/memory-stats"),
    refetchInterval: 30000,
  });
}

export function useMemoryTierHealth() {
  return useQuery({
    queryKey: ["memory-tier-health"],
    queryFn: () =>
      fetchJSON<{
        tiers: MemoryTierHealth[];
        timestamp: string;
      }>("/api/memory/health"),
    refetchInterval: 30000,
  });
}

export type TimeSeriesMetric =
  | "docs_ingested"
  | "memory_writes"
  | "recall_queries"
  | "collection_growth"
  | "skill_executions"
  | "skill_failures";

export type TimeSeriesWindow = "day" | "week" | "month";

export function useTimeSeries(metric: TimeSeriesMetric, window: TimeSeriesWindow) {
  return useQuery({
    queryKey: ["time-series", metric, window],
    queryFn: () =>
      fetchJSON<{
        points: Array<{ bucket: string; value: number }>;
        metric: string;
        window: string;
        timestamp: string;
      }>(`/api/time-series?metric=${metric}&window=${window}`),
    refetchInterval: POLL_INTERVALS.knowledge, // 60s -- analytics don't need real-time
  });
}

export interface CollectionTrend {
  name: string;
  category: KnowledgeCollection["category"];
  totalFiles: number;
  recentFiles: number;
  lastUpdated: string | null;
  points: Array<{ bucket: string; value: number; cumulative: number }>;
}

export function useKnowledgeTrends(window: TimeSeriesWindow, limit = 12) {
  return useQuery({
    queryKey: ["knowledge-trends", window, limit],
    queryFn: () =>
      fetchJSON<{
        collections: CollectionTrend[];
        window: TimeSeriesWindow;
        buckets: string[];
        timestamp: string;
      }>(`/api/knowledge/trends?window=${window}&limit=${limit}`),
    refetchInterval: POLL_INTERVALS.knowledge,
  });
}

export function useDelegations(limit = 50) {
  return useQuery({
    queryKey: ["delegations", limit],
    queryFn: () =>
      fetchJSON<{
        delegations: Array<{
          task_id: string;
          from_agent: string;
          to_agent: string;
          task_summary: string;
          priority: number;
          status: string;
          created_at: string;
          updated_at: string;
        }>;
        timestamp: string;
      }>(`/api/hive?type=delegation&limit=${limit}`),
    refetchInterval: POLL_INTERVALS.hive,
  });
}

export function useLineage(taskId: string | null) {
  return useQuery({
    queryKey: ["lineage", taskId],
    queryFn: () =>
      fetchJSON<{
        task_id: string;
        context_id: string | null;
        delegation: Record<string, unknown> | null;
        actions: Array<{
          id: number;
          agent_id: string;
          action_type: string;
          summary: string;
          artifacts: Record<string, unknown> | null;
          timestamp: string;
        }>;
        timestamp: string;
      }>(`/api/hive?task_id=${taskId}`),
    enabled: !!taskId,
  });
}

export function useAgentCards() {
  return useQuery({
    queryKey: ["agent-cards"],
    queryFn: () =>
      fetchJSON<{
        cards: Array<{
          name: string;
          description: string;
          version: string;
          url: string;
          capabilities: Record<string, boolean>;
          authentication: { schemes: string[] };
          skills: Array<{
            id: string;
            name: string;
            description: string;
            tags: string[];
          }>;
          extensions: {
            kitchen: {
              id: string;
              platform: string;
              location: string;
              role: string;
            };
          };
        }>;
        timestamp: string;
      }>("/api/agents/cards"),
    refetchInterval: POLL_INTERVALS.health,
  });
}
