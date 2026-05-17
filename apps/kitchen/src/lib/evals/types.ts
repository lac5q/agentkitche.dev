export type EvalLayer = "l1" | "l2" | "l3";
export type EvalDriftStatus = "passed" | "halted";

export interface EvalJudgeConfig {
  provider: string;
  model: string;
  modelFamily: string;
  promptTemplateVersion: string;
  localEndpoint?: string;
}

export interface EvalGoldenSetConfig {
  default: string;
  perRole: Record<string, string>;
}

export interface EvalScorerConfig {
  l1Capability: string[];
  l2Quality: string[];
  l3Outcome: string[];
}

export interface EvalWeights {
  l1: number;
  l2: number;
  l3: number;
}

export interface EvalDriftGuardConfig {
  goldenAgreementFloor: number;
  judgeRotationRequiresRebaseline: boolean;
}

export interface SealEvalConfig {
  reflectionThreshold: number;
  autoApply: boolean;
  proposalTypes: string[];
}

export interface AgentEvalOverride {
  eval?: {
    goldenSet?: string;
    weights?: Partial<EvalWeights>;
  };
}

export interface PublicApiRateLimitConfig {
  requestsPerMinute: number;
  burst: number;
}

export interface PublicApiConfig {
  rateLimit: PublicApiRateLimitConfig;
}

/** Phase 61: Per-company L3 KPI sub-weights (must sum to 1.0). */
export interface CompanyL3SubWeights {
  completion_rate: number;
  escalation_rate: number;
  ttr_p50: number;
  operator_approval_rate: number;
  cost_per_task: number;
}

/** Phase 61: Per-company config block (soft tenant, Phase 62 formalizes). */
export interface CompanyEvalConfig {
  l3_sub_weights: CompanyL3SubWeights;
}

/** Phase 61: business_ops block from memroos.eval.yaml. */
export interface BusinessOpsConfig {
  poll_interval_seconds: number;
  correlation_id_field: string;
}

/** Phase 65: finance reconciliation terminology and golden set wiring. */
export interface FinanceReconciliationConfig {
  enabled: boolean;
  transactionLabel: string;
  reconciliationLabel: string;
  exceptionLabel: string;
  goldenSet: string;
}

/** Phase 66: self-hosted compliance posture controls. */
export interface ComplianceConfig {
  dataResidency: {
    enabled: boolean;
    allowedLocalHosts: string[];
  };
  auditRetentionDays: number;
  enabledAdapters: string[];
}

/** Phase 67: Chain-of-Verification runtime and scorer config. */
export interface CoveEvalConfig {
  enabled: boolean;
  maxVerificationQuestions: number;
  parallelVerification: boolean;
  judgeEndpoint?: string;
}

export interface EvalConfig {
  judgeModel: EvalJudgeConfig;
  goldenSets: EvalGoldenSetConfig;
  scorers: EvalScorerConfig;
  weights: EvalWeights;
  /** Named preset weight profiles. Preset values override manual weights when activePreset is set. */
  weightPresets: Record<string, EvalWeights>;
  /**
   * Name of the active preset. When non-null, `weightsForAgent()` uses the preset vector
   * instead of the manual `weights` block. Per-agent overrides are NOT applied on top of presets
   * (preset is a global operator-level override). Set to null to revert to manual weights.
   */
  activePreset: string | null;
  driftGuard: EvalDriftGuardConfig;
  seal: SealEvalConfig;
  agents: Record<string, AgentEvalOverride>;
  /** Phase 62: public API surface configuration. */
  publicApi?: PublicApiConfig;
  /** Phase 61: Per-company L3 KPI weight overrides. */
  companies: Record<string, CompanyEvalConfig>;
  /** Phase 61: Business-ops adapter polling configuration. */
  businessOps: BusinessOpsConfig;
  /** Phase 65: Finance reconciliation vertical configuration. */
  finance: FinanceReconciliationConfig;
  /** Phase 66: self-hosted compliance posture. */
  compliance: ComplianceConfig;
  /** Phase 67: Chain-of-Verification config. */
  cove: CoveEvalConfig;
}

export interface AgentEvalTrace {
  traceId: string;
  agentId: string;
  agentModelProvider?: string;
  agentModel?: string;
  agentModelFamily?: string;
  role?: string;
  input: string;
  output: string;
  expectedFacts?: string[];
  toolCalls?: Array<{ name: string; valid?: boolean; schemaValid?: boolean }>;
  memory?: {
    expectedFacts?: string[];
    retrievedFacts?: string[];
    recallAtK?: number;
    precisionAtK?: number;
    mrr?: number;
  };
  outcome?: {
    completed?: boolean;
    escalated?: boolean;
    ttrMs?: number;
    operatorApproved?: boolean;
    costUsd?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface GoldenSetExample {
  id: string;
  role?: string;
  input: string;
  expectedOutput: string;
  humanScore: number;
  trace?: AgentEvalTrace;
  tags?: string[];
}

export interface EvalScorerResult {
  scorerId: string;
  layer: EvalLayer;
  score: number;
  detail: string;
  metadata?: Record<string, unknown>;
}

export interface EvalScorer {
  id: string;
  label: string;
  layer: EvalLayer;
  score(trace: AgentEvalTrace, context: EvalScoringContext): EvalScorerResult;
}

export interface EvalScoringContext {
  config: EvalConfig;
  judge: EvalJudgeResult;
  goldenSet: GoldenSetExample[];
}

export interface EvalJudgeResult {
  score: number;
  rubricScores: {
    faithful: number;
    useful: number;
    policy: number;
  };
  model: string;
  provider: string;
  modelFamily: string;
  promptTemplateVersion: string;
  promptHash: string;
  positionBiasMitigation: {
    swapAugmentation: boolean;
    orderAgreement: boolean;
  };
}

export interface EvalLayerBreakdown {
  score: number;
  weight: number;
  scorers: EvalScorerResult[];
}

export interface EvalDriftGuardResult {
  status: EvalDriftStatus;
  agreement: number;
  floor: number;
  goldenSetVersion: string;
  examples: Array<{
    id: string;
    humanScore: number;
    judgeScore: number;
    agreed: boolean;
  }>;
}

export interface EvalRunResult {
  id: string;
  traceId: string;
  agentId: string;
  role: string;
  compositeW: number;
  trusted: boolean;
  layers: Record<EvalLayer, EvalLayerBreakdown>;
  scorerResults: EvalScorerResult[];
  judge: EvalJudgeResult;
  driftGuard: EvalDriftGuardResult;
  configHash: string;
  goldenSetPath: string;
  startedAt: string;
  completedAt: string;
}
