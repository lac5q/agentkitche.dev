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
  AgentProtocol,
  AgentStatus,
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

export interface CreateAgentOnboardingInviteInput {
  agentId?: string;
  name?: string;
  role?: string;
  platform?: RegisterAgentInput["platform"];
  protocol?: RegisterAgentInput["protocol"];
  ttlMinutes?: number;
  kitchenUrl?: string;
  mcpUrl?: string;
  mcpTarget?: string;
  operatorKey?: string;
}

export interface AgentOnboardingInviteResult {
  ok: boolean;
  token: string;
  expiresAt: string;
  command: string;
  mcpUrl: string;
  timestamp: string;
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
  status: "up" | "degraded" | "down" | "not_configured";
  detail?: string;
  count?: number | null;
  lastWrite?: string | null;
}

export interface ContextSourceHealth {
  id: string;
  type: "qmd" | "gmail" | "spark" | "mem0" | "local-folder";
  status: "ok" | "stale" | "missing" | "degraded" | "disabled";
  enabled: boolean;
  lastRun: string | null;
  ageMinutes: number | null;
  documentCount: number;
  qmdCollection: string | null;
  lastIndexedMarker: string | null;
  lastError: string | null;
  repairHint: string;
  safeAnswerPolicy: "source_required" | "degrade_with_warning" | "optional";
}

export interface ContextHealthResponse {
  sources: ContextSourceHealth[];
  timestamp: string;
}

export function useContextSourceHealth() {
  return useQuery({
    queryKey: ["context", "health"],
    queryFn: () => fetchJSON<ContextHealthResponse>("/api/context/health"),
    refetchInterval: 60_000,
  });
}

export interface MultiMemorySearchResult {
  id: string;
  tier: "vector" | "graph" | "episodic";
  title: string;
  content: string;
  source?: string;
  score?: number;
  metadata?: unknown;
}

export interface MultiMemorySearchTier {
  tier: "vector" | "graph" | "episodic";
  ok: boolean;
  count: number;
  error?: string;
}

export interface MultiMemorySearchResponse {
  ok: boolean;
  query: string;
  tiers: MultiMemorySearchTier[];
  results: MultiMemorySearchResult[];
  timestamp: string;
}

export interface MemoryEvalRunSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  p95LatencyMs: number;
  tierFailures: Array<"vector" | "graph" | "episodic" | "qmd">;
}

export interface MemoryEvalLatestResponse {
  ok: boolean;
  run: {
    id: string;
    mode: "canary" | "gold" | "full";
    status: "passed" | "failed";
    startedAt: string;
    completedAt: string;
    summary: MemoryEvalRunSummary;
    results: unknown[];
  } | null;
  timestamp: string;
}

export interface SecurityReportResponse {
  summary: {
    status: "clear" | "watch" | "attention";
    securityEvents: number;
    auditEvents?: number;
    highSeverity: number;
    mediumSeverity: number;
    blockedAttempts: number;
    lastEventAt: string | null;
    lastAuditAt?: string | null;
    topActors: Array<{ actor: string; count: number }>;
  };
  controls: Array<{ id: string; label: string; status: string }>;
  timeline: Array<{
    id: number;
    actor: string;
    action: string;
    target: string;
    detail: string | null;
    severity: string;
    timestamp: string;
    blocked: boolean;
  }>;
  auditActivity?: Array<{
    id: number;
    actor: string;
    action: string;
    target: string;
    detail: string | null;
    severity: string;
    timestamp: string;
    blocked: boolean;
    securityEvent: boolean;
  }>;
  timestamp: string;
}

export interface SecurityCapabilitiesResponse {
  summary: {
    totalAgents: number;
    strictAgents: number;
    standardAgents: number;
    permissiveAgents: number;
    agentsWithSecurityCapabilities: number;
  };
  policies: {
    defaultMode: string;
    dispatchPolicy: string;
    a2aPolicy: string;
    memoryWritePolicy: string;
  };
  agents: Array<{
    id: string;
    name: string;
    role: string;
    protocol: AgentProtocol;
    status: AgentStatus;
    securityMode: "strict" | "standard" | "permissive";
    securityCapabilities: string[];
    readinessScore: number;
    lastHeartbeat: string | null;
  }>;
  timestamp: string;
}

export interface ModelRoutingRecommendation {
  provider: string;
  model: string;
  label: string;
  strengths: string[];
  taskTypes: string[];
  taskType: string;
  strategy: "balanced" | "cost" | "quality" | "latency";
  score: number;
  observations: number;
  successRate: number | null;
  averageQuality: number | null;
  averageLatencyMs: number | null;
}

export interface ModelRoutingDashboardResponse {
  events: Array<{
    id: number;
    taskType: string;
    agentId: string | null;
    provider: string;
    model: string;
    strategy: string;
    latencyMs: number | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number | null;
    success: boolean;
    qualityScore: number | null;
    contextTags: string[];
    promptHash: string | null;
    error: string | null;
    createdAt: string;
  }>;
  summary: {
    totalRuns: number;
    successfulRuns: number;
    successRate: number | null;
    averageQuality: number | null;
    averageLatencyMs: number | null;
  };
  timestamp: string;
}

export interface ModelRoutingEvalsResponse {
  dimensions: Array<{ id: string; label: string; rubric: string }>;
  referenceTasks: Array<{ id: string; taskType: string; strategy: string }>;
  summary: ModelRoutingDashboardResponse["summary"];
  timestamp: string;
}

export interface CacheStatsResponse {
  stats: {
    entries: number;
    hits: number;
    misses: number;
    evictions: number;
    invalidations: number;
    memoryBytes: number;
    maxEntries: number;
  };
  performance: {
    ok: boolean;
    routes: Array<{
      route: string;
      p95Ms: number;
      budgetMs: number;
      status: "pass" | "fail";
    }>;
  };
  timestamp: string;
}

export interface EvalConfigResponse {
  config: import("@/lib/evals/types").EvalConfig;
  yaml: string;
  timestamp: string;
}

export interface EvalRunResponse {
  ok: boolean;
  result: import("@/lib/evals/types").EvalRunResult;
  timestamp: string;
}

export interface EvalHistoryResponse {
  runs: Array<import("@/lib/evals/types").EvalRunResult & {
    examples: import("@/lib/evals/types").EvalDriftGuardResult["examples"];
  }>;
  timestamp: string;
}

export interface SealProposal {
  id: string;
  traceId: string;
  runId: string;
  agentId: string;
  proposalType: string;
  status: "pending" | "approved" | "rejected" | "applied" | "rolled_back";
  diff: Record<string, unknown>;
  rationale: string;
  forecastWDelta: number;
  baselineW: number;
  baselineRunId: string;
  baselineLayers: Record<string, { score: number; weight: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface SealAuditLogEntry {
  id: string;
  proposalId: string;
  event: "proposed" | "approved" | "rejected" | "apply_started" | "apply_succeeded" | "apply_failed" | "rolled_back";
  baselineW: number | null;
  postApplyW: number | null;
  deltaL1: number | null;
  deltaL2: number | null;
  deltaL3: number | null;
  deltaComposite: number | null;
  detail: Record<string, unknown>;
  timestamp: string;
}

export interface SealProposalsResponse {
  proposals: SealProposal[];
  timestamp: string;
}

export interface SealProposalResponse {
  proposal: SealProposal;
  timestamp: string;
}

export interface SealAuditLogResponse {
  entries: SealAuditLogEntry[];
  timestamp: string;
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

export function createAgentOnboardingInvite(input: CreateAgentOnboardingInviteInput) {
  const { operatorKey, ...body } = input;
  return mutateJSON<AgentOnboardingInviteResult>("/api/onboarding/invite", {
    method: "POST",
    headers: operatorKey ? { "x-kitchen-operator-key": operatorKey } : undefined,
    body: JSON.stringify(body),
  });
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

export function useCreateAgentOnboardingInviteMutation() {
  return useMutation({
    mutationFn: createAgentOnboardingInvite,
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

export function useEvalConfig() {
  return useQuery({
    queryKey: ["evals", "config"],
    queryFn: () => fetchJSON<EvalConfigResponse>("/api/evals/config"),
    staleTime: 15_000,
  });
}

export function updateEvalConfig(config: import("@/lib/evals/types").EvalConfig) {
  return mutateJSON<EvalConfigResponse & { ok: boolean }>("/api/evals/config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}

export function useUpdateEvalConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateEvalConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evals"] });
    },
  });
}

export function runEvalTrace(trace: import("@/lib/evals/types").AgentEvalTrace) {
  return mutateJSON<EvalRunResponse>("/api/evals/run", {
    method: "POST",
    body: JSON.stringify({ trace }),
  });
}

export function useRunEvalTraceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runEvalTrace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evals", "history"] });
    },
  });
}

export function useEvalHistory(limit = 25) {
  return useQuery({
    queryKey: ["evals", "history", limit],
    queryFn: () => fetchJSON<EvalHistoryResponse>(`/api/evals/history?limit=${limit}`),
    refetchInterval: 30_000,
  });
}

export function useSealProposals(status?: SealProposal["status"]) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  return useQuery({
    queryKey: ["seal", "proposals", status ?? "all"],
    queryFn: () => fetchJSON<SealProposalsResponse>(`/api/seal/proposals${qs ? `?${qs}` : ""}`),
    refetchInterval: 30_000,
  });
}

export function useSealProposal(id: string | null) {
  return useQuery({
    queryKey: ["seal", "proposal", id],
    queryFn: () => fetchJSON<SealProposalResponse>(`/api/seal/proposals/${encodeURIComponent(id as string)}`),
    enabled: Boolean(id),
  });
}

export function useSealAuditLog(proposalId?: string) {
  const params = new URLSearchParams();
  if (proposalId) params.set("proposalId", proposalId);
  const qs = params.toString();
  return useQuery({
    queryKey: ["seal", "audit", proposalId ?? "all"],
    queryFn: () => fetchJSON<SealAuditLogResponse>(`/api/seal/audit${qs ? `?${qs}` : ""}`),
    refetchInterval: 30_000,
  });
}

function decideSealProposal(input: { id: string; action: "approve" | "reject" | "apply"; reasoning?: string }) {
  return mutateJSON<SealProposalResponse & { ok: boolean }>(`/api/seal/proposals/${encodeURIComponent(input.id)}`, {
    method: "POST",
    body: JSON.stringify({ action: input.action, reasoning: input.reasoning }),
  });
}

export function useApproveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reasoning?: string }) => decideSealProposal({ ...input, action: "approve" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seal"] }),
  });
}

export function useRejectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reasoning?: string }) => decideSealProposal({ ...input, action: "reject" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seal"] }),
  });
}

export function useApplyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reasoning?: string }) => decideSealProposal({ ...input, action: "apply" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seal"] }),
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

export function useMultiMemorySearch(query: string, limit = 8) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  return useQuery({
    queryKey: ["memory", "multi-search", query, limit],
    queryFn: () => fetchJSON<MultiMemorySearchResponse>(`/api/memory/multi-search?${params}`),
    enabled: query.trim().length > 0,
    staleTime: 15_000,
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

export function useSecurityReport(limit = 20) {
  return useQuery({
    queryKey: ["security-report", limit],
    queryFn: () => fetchJSON<SecurityReportResponse>(`/api/security/report?limit=${limit}`),
    refetchInterval: POLL_INTERVALS.hive,
  });
}

export function useSecurityCapabilities() {
  return useQuery({
    queryKey: ["security-capabilities"],
    queryFn: () => fetchJSON<SecurityCapabilitiesResponse>("/api/security/capabilities"),
    refetchInterval: POLL_INTERVALS.agents,
  });
}

export function useCacheStats() {
  return useQuery({
    queryKey: ["cache-stats"],
    queryFn: () => fetchJSON<CacheStatsResponse>("/api/cache/stats"),
    refetchInterval: 30000,
  });
}

export function usePurgeCacheMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tag?: string) =>
      mutateJSON<{ ok: boolean; purged: number; tag: string | null; timestamp: string }>(
        "/api/cache/purge",
        { method: "POST", body: JSON.stringify(tag ? { tag } : {}) }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
    },
  });
}

export function useModelRoutingDashboard(limit = 30) {
  return useQuery({
    queryKey: ["model-routing-dashboard", limit],
    queryFn: () =>
      fetchJSON<ModelRoutingDashboardResponse>(
        `/api/model-routing/telemetry?limit=${limit}`
      ),
    refetchInterval: POLL_INTERVALS.tokens,
  });
}

export function useModelRoutingRecommendations(taskType = "engineering", strategy = "balanced") {
  const params = new URLSearchParams();
  params.set("taskType", taskType);
  params.set("strategy", strategy);
  return useQuery({
    queryKey: ["model-routing-recommendations", taskType, strategy],
    queryFn: () =>
      fetchJSON<{
        taskType: string;
        strategy: string;
        recommendations: ModelRoutingRecommendation[];
        timestamp: string;
      }>(`/api/model-routing/recommendations?${params}`),
    refetchInterval: POLL_INTERVALS.tokens,
  });
}

export function useModelRoutingEvals() {
  return useQuery({
    queryKey: ["model-routing-evals"],
    queryFn: () => fetchJSON<ModelRoutingEvalsResponse>("/api/model-routing/evals"),
    refetchInterval: POLL_INTERVALS.tokens,
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

export function useMemoryEvalLatest() {
  return useQuery({
    queryKey: ["memory-eval-latest"],
    queryFn: () => fetchJSON<MemoryEvalLatestResponse>("/api/memory/evals/latest"),
    refetchInterval: 60000,
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

// ---------------------------------------------------------------------------
// Memory autogen — proposals and policy lab
// ---------------------------------------------------------------------------

export interface MemoryProposalTypeMeta {
  label: string;
  description: string;
}

export interface MemoryProposalsResponse {
  proposals: SealProposal[];
  types: Record<string, MemoryProposalTypeMeta>;
  timestamp: string;
}

export interface PolicyRankResult {
  rank: number;
  name: string;
  compositeW: number;
  layerScores: { l1: number; l2: number; l3: number };
  variantConfig: Record<string, unknown>;
  evalRunId: string;
}

export interface PolicyLabResponse {
  ok: boolean;
  goldenSetId: string;
  ranked: PolicyRankResult[];
  timestamp: string;
}

export interface MemoryPolicyVariant {
  name: string;
  config: Record<string, unknown>;
}

export function useMemoryProposals(status?: string) {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery({
    queryKey: ["memory-proposals", status],
    queryFn: () => fetchJSON<MemoryProposalsResponse>(`/api/memory/proposals${params}`),
    refetchInterval: 15000,
  });
}

export function useRunPolicyLabMutation() {
  return useMutation({
    mutationFn: (payload: { variants: MemoryPolicyVariant[]; goldenSetId?: string }) =>
      mutateJSON<PolicyLabResponse>("/api/memory/policy-lab", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}

// ---------------------------------------------------------------------------
// Eval preset selector hooks (Phase 60)
// ---------------------------------------------------------------------------

export interface AgentProposal {
  id: string;
  traceId: string;
  runId: string;
  agentId: string;
  proposalType: "agent_instruction_patch" | "skill_addition" | "tool_routing_update";
  status: SealProposal["status"];
  diff: Record<string, unknown>;
  rationale: string;
  forecastWDelta: number;
  baselineW: number;
  createdAt: string;
}

export interface AgentProposalsResponse {
  proposals: AgentProposal[];
  timestamp: string;
}

export function useEvalPresets() {
  return useQuery({
    queryKey: ["evals", "presets"],
    queryFn: () => fetchJSON<EvalConfigResponse>("/api/evals/config").then((r) => ({
      presets: r.config.weightPresets ?? {},
      activePreset: r.config.activePreset ?? null,
    })),
    staleTime: 15_000,
  });
}

function setActivePreset(activePreset: string | null) {
  return mutateJSON<EvalConfigResponse & { ok: boolean }>("/api/evals/config", {
    method: "POST",
    body: JSON.stringify({ active_preset: activePreset }),
  });
}

export function useSetActivePresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setActivePreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evals"] });
    },
  });
}

export function useAgentProposals(status?: AgentProposal["status"]) {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  return useQuery({
    queryKey: ["agent-proposals", status ?? "all"],
    queryFn: () => fetchJSON<AgentProposalsResponse>(`/api/agents/proposals${params}`),
    refetchInterval: 30_000,
  });
}

function triggerAgentReflection(agentId: string) {
  return mutateJSON<{ ok: boolean; proposals: AgentProposal[]; timestamp: string }>(
    "/api/agents/proposals",
    { method: "POST", body: JSON.stringify({ action: "reflect", agentId }) }
  );
}

export function useTriggerAgentReflectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerAgentReflection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-proposals"] });
    },
  });
}

export function useMemoryProposalActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "approve" | "reject" | "apply";
    }) =>
      mutateJSON<{
        ok: boolean;
        proposal: SealProposal;
        timestamp: string;
      }>(`/api/seal/proposals/${encodeURIComponent(id)}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["seal"] });
    },
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

// ---------------------------------------------------------------------------
// Phase 61 — Business-Ops Outcome Layer (L3) hooks
// ---------------------------------------------------------------------------

export interface BusinessOutcomeEventRow {
  id: number;
  tenantId: string;
  correlationId: string;
  sourceSystem: "crm" | "helpdesk" | "finance";
  adapter: string;
  eventType: string;
  kpiKey: string;
  kpiValue: number;
  rawJson: string;
  agentId?: string;
  polledAt: string;
  createdAt: string;
}

export interface BusinessOutcomeEventsResponse {
  events: BusinessOutcomeEventRow[];
  count: number;
  timestamp: string;
}

export interface BusinessOpsPollSummary {
  ok: boolean;
  totalEventsWritten: number;
  errors: string[];
  adapterResults: Array<{
    adapter: string;
    category: string;
    eventsPolled: number;
    eventsWritten: number;
    error: string | null;
  }>;
  polledAt: string;
  timestamp: string;
}

export interface BusinessOutcomeEventsFilter {
  correlationId?: string;
  agentId?: string;
  since?: string;
  limit?: number;
}

export function useBusinessOutcomeEvents(filter: BusinessOutcomeEventsFilter = {}) {
  const params = new URLSearchParams();
  if (filter.correlationId) params.set("correlationId", filter.correlationId);
  if (filter.agentId) params.set("agentId", filter.agentId);
  if (filter.since) params.set("since", filter.since);
  if (filter.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return useQuery({
    queryKey: ["l3-events", filter],
    queryFn: () => fetchJSON<BusinessOutcomeEventsResponse>(`/api/l3/events${qs ? `?${qs}` : ""}`),
    refetchInterval: 30_000,
  });
}

function triggerAdapterPoll(input: { since?: string; adapters?: string[] }) {
  return mutateJSON<BusinessOpsPollSummary>("/api/l3/poll", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useTriggerAdapterPollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerAdapterPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["l3-events"] });
    },
  });
}

// ---- Phase 64: Audit Log + HIL Escalations hooks ----

export interface AuditEntriesFilter {
  agentId?: string;
  eventType?: string;
  actorId?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditEntriesResponse {
  entries: import("@/lib/audit/schema").AuditEntry[];
  nextCursor?: string;
  total: number;
}

export interface EscalationsFilter {
  status?: "open" | "resolved" | "sla_breached" | "all";
  tenantId?: string;
  limit?: number;
}

export interface EscalationWithCountdown {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  escalation_type: "agent_escalate" | "seal_approval" | "eval_below_threshold";
  sla_seconds: number;
  sla_deadline: string;
  status: "open" | "resolved" | "sla_breached";
  assigned_to?: string | null;
  opened_by: string;
  resolved_by?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  created_at: string;
  isOverdue: boolean;
  slaRemainingMs: number;
}

export interface EscalationsResponse {
  escalations: EscalationWithCountdown[];
  timestamp: string;
}

/** Queries paginated audit entries with filter support. */
export function useAuditEntries(filter: AuditEntriesFilter = {}) {
  const params = new URLSearchParams();
  if (filter.agentId) params.set("agentId", filter.agentId);
  if (filter.eventType) params.set("eventType", filter.eventType);
  if (filter.actorId) params.set("actorId", filter.actorId);
  if (filter.tenantId) params.set("tenantId", filter.tenantId);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.cursor) params.set("cursor", filter.cursor);
  const qs = params.toString();
  return useQuery({
    queryKey: ["audit-entries", filter],
    queryFn: () => fetchJSON<AuditEntriesResponse>(`/api/audit${qs ? `?${qs}` : ""}`),
  });
}

/**
 * Returns a download URL for the audit export endpoint.
 * Triggers a browser download when assigned to window.location.href.
 */
export function useAuditExportUrl(filter: AuditEntriesFilter, format: "ndjson" | "csv"): string {
  const params = new URLSearchParams({ format });
  if (filter.agentId) params.set("agentId", filter.agentId);
  if (filter.eventType) params.set("eventType", filter.eventType);
  if (filter.actorId) params.set("actorId", filter.actorId);
  if (filter.tenantId) params.set("tenantId", filter.tenantId);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  return `/api/audit/export?${params.toString()}`;
}

/** Queries HIL escalations; auto-refreshes every 30s for SLA countdown freshness. */
export function useEscalations(filter: EscalationsFilter = {}) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.tenantId) params.set("tenantId", filter.tenantId);
  if (filter.limit) params.set("limit", String(filter.limit));
  const qs = params.toString();
  return useQuery({
    queryKey: ["escalations", filter],
    queryFn: () => fetchJSON<EscalationsResponse>(`/api/escalations${qs ? `?${qs}` : ""}`),
    refetchInterval: 30_000,
  });
}

function resolveEscalationFn(input: { id: string; note?: string }) {
  return mutateJSON<{ escalation: import("@/lib/audit/schema").HilEscalation; timestamp: string }>(
    `/api/escalations/${encodeURIComponent(input.id)}/resolve`,
    { method: "POST", body: JSON.stringify({ note: input.note }) }
  );
}

/** Mutation for resolving a HIL escalation. Invalidates escalations query on success. */
export function useResolveEscalation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveEscalationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-entries"] });
    },
  });
}
