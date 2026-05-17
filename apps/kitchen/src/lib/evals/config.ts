import crypto from "crypto";
import fs from "fs";
import path from "path";

import { resolveFromRepoRoot } from "@/lib/paths";
import { BUILT_IN_PRESETS, resolveWeights } from "./presets";
import type { BusinessOpsConfig, CompanyEvalConfig, EvalConfig, EvalWeights } from "./types";

export const EVAL_CONFIG_PATH = "memroos.eval.yaml";

export function buildDefaultEvalConfig(): EvalConfig {
  return {
    judgeModel: {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      modelFamily: "anthropic",
      promptTemplateVersion: "v1",
      localEndpoint: undefined,
    },
    goldenSets: {
      default: "./golden-sets/business-ops-50.jsonl",
      perRole: {
        sales: "./golden-sets/sales-50.jsonl",
        support: "./golden-sets/support-50.jsonl",
        finance: "./golden-sets/finance-50.jsonl",
        ops: "./golden-sets/ops-50.jsonl",
      },
    },
    scorers: {
      l1Capability: ["tool_call_schema", "json_valid", "on_task", "memory_recall_l1"],
      l2Quality: [
        "rubric_5pt_faithful",
        "rubric_5pt_useful",
        "rubric_5pt_policy",
        "memory_recall_l2",
        "trajectory_multi_step",
      ],
      l3Outcome: ["completion_rate", "escalation_rate", "ttr_p50", "operator_approval", "cost_per_task"],
    },
    weights: { l1: 0.2, l2: 0.5, l3: 0.3 },
    weightPresets: { ...BUILT_IN_PRESETS },
    activePreset: null,
    driftGuard: {
      goldenAgreementFloor: 0.85,
      judgeRotationRequiresRebaseline: true,
    },
    seal: {
      reflectionThreshold: 0.6,
      autoApply: false,
      proposalTypes: ["noop_test"],
    },
    agents: {},
    publicApi: {
      rateLimit: {
        requestsPerMinute: 60,
        burst: 10,
      },
    },
    companies: {
      default: {
        l3_sub_weights: {
          completion_rate: 0.35,
          escalation_rate: 0.25,
          ttr_p50: 0.20,
          operator_approval_rate: 0.10,
          cost_per_task: 0.10,
        },
      },
    },
    businessOps: {
      poll_interval_seconds: 300,
      correlation_id_field: "kitchen_correlation_id",
    },
    finance: {
      enabled: false,
      transactionLabel: "transaction",
      reconciliationLabel: "reconciliation",
      exceptionLabel: "exception",
      goldenSet: "./golden-sets/finance-reconciliation.jsonl",
    },
    compliance: {
      dataResidency: {
        enabled: false,
        allowedLocalHosts: ["localhost", "127.0.0.1", "::1", "host.docker.internal", "ollama", "vllm"],
      },
      auditRetentionDays: 365,
      enabledAdapters: ["hubspot", "intercom", "quickbooks", "bank_reconciliation"],
    },
    cove: {
      enabled: false,
      maxVerificationQuestions: 4,
      parallelVerification: true,
      judgeEndpoint: undefined,
    },
  };
}

/**
 * Validate that a CompanyEvalConfig has l3_sub_weights summing to 1.0.
 * Throws with an actionable message if validation fails.
 */
function validateCompanySubWeights(companyId: string, config: CompanyEvalConfig): void {
  const weights = config.l3_sub_weights;
  const sum = Object.values(weights).reduce((acc, v) => acc + v, 0);
  if (Math.abs(sum - 1.0) > 1e-6) {
    throw new Error(
      `[eval config] companies.${companyId}.l3_sub_weights must sum to 1.0 ` +
      `(got ${sum.toFixed(6)}). Adjust the weights and reload.`
    );
  }
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseWeights(value: string | undefined): Partial<EvalWeights> {
  if (!value) return {};
  const output: Partial<EvalWeights> = {};
  for (const pair of value.replace(/^\{/, "").replace(/\}$/, "").split(",")) {
    const [rawKey, rawValue] = pair.split(":").map((part) => part.trim());
    if ((rawKey === "l1" || rawKey === "l2" || rawKey === "l3") && rawValue) {
      output[rawKey] = Number(rawValue);
    }
  }
  return output;
}

function scalar(value: string | undefined, fallback: string): string {
  return (value ?? fallback).trim().replace(/^["']|["']$/g, "");
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function numberValue(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseEvalConfigYaml(yaml: string): EvalConfig {
  const defaults = buildDefaultEvalConfig();
  const values = new Map<string, string>();
  const agents: EvalConfig["agents"] = {};
  const weightPresets: Record<string, EvalWeights> = { ...BUILT_IN_PRESETS };
  const companies: Record<string, CompanyEvalConfig> = {};
  let section = "";
  let subsection = "";
  let currentAgent = "";
  let currentPreset = "";
  let currentCompany = "";
  let companySubsection = "";

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey.trim();
    const value = rest.join(":").trim();

    if (indent === 0 && trimmed.endsWith(":")) {
      section = key;
      subsection = "";
      currentAgent = "";
      currentPreset = "";
      currentCompany = "";
      companySubsection = "";
      continue;
    }
    if (indent === 2 && trimmed.endsWith(":")) {
      subsection = key;
      if (section === "agents") {
        currentAgent = key;
        agents[currentAgent] = { eval: {} };
      }
      if (section === "weight_presets") {
        currentPreset = key;
        weightPresets[currentPreset] = { l1: 0.2, l2: 0.5, l3: 0.3 };
      }
      if (section === "companies") {
        currentCompany = key;
        companies[currentCompany] = {
          l3_sub_weights: {
            completion_rate: 0.35,
            escalation_rate: 0.25,
            ttr_p50: 0.20,
            operator_approval_rate: 0.10,
            cost_per_task: 0.10,
          },
        };
      }
      continue;
    }
    if (indent === 4 && section === "agents" && trimmed.endsWith(":")) {
      subsection = key;
      continue;
    }
    if (indent === 4 && section === "companies" && trimmed.endsWith(":")) {
      companySubsection = key;
      continue;
    }

    // Parse inline preset on one line: outcome-weighted: { l1: 0.1, l2: 0.4, l3: 0.5 }
    if (indent === 2 && section === "weight_presets" && value.startsWith("{")) {
      const parsed = parseWeights(value);
      weightPresets[key] = {
        l1: parsed.l1 ?? 0.2,
        l2: parsed.l2 ?? 0.5,
        l3: parsed.l3 ?? 0.3,
      };
      continue;
    }

    const compositeKey = [section, subsection, key].filter(Boolean).join(".");
    values.set(compositeKey, value);

    if (section === "agents" && currentAgent && subsection === "eval") {
      if (key === "golden_set") agents[currentAgent].eval = { ...(agents[currentAgent].eval ?? {}), goldenSet: scalar(value, "") };
      if (key === "weights") agents[currentAgent].eval = { ...(agents[currentAgent].eval ?? {}), weights: parseWeights(value) };
    }

    // Parse multi-line preset fields: l1: 0.1 under weight_presets.<name>
    if (section === "weight_presets" && currentPreset && indent === 4) {
      const preset = weightPresets[currentPreset] ?? { l1: 0.2, l2: 0.5, l3: 0.3 };
      if (key === "l1" || key === "l2" || key === "l3") {
        const num = Number(value);
        if (Number.isFinite(num)) {
          weightPresets[currentPreset] = { ...preset, [key]: num };
        }
      }
    }

    // Parse companies.<company>.l3_sub_weights.<kpi_key>: <value>
    if (section === "companies" && currentCompany && companySubsection === "l3_sub_weights" && indent === 6) {
      const company = companies[currentCompany];
      if (company) {
        const num = Number(value);
        if (Number.isFinite(num)) {
          const validKeys = ["completion_rate", "escalation_rate", "ttr_p50", "operator_approval_rate", "cost_per_task"];
          if (validKeys.includes(key)) {
            company.l3_sub_weights[key as keyof CompanyEvalConfig["l3_sub_weights"]] = num;
          }
        }
      }
    }
  }

  // Resolve active_preset: read from top-level key (no section prefix)
  const activePresetRaw = values.get("active_preset") ?? values.get(".active_preset");
  const activePreset =
    activePresetRaw && activePresetRaw !== "null" && activePresetRaw !== ""
      ? activePresetRaw.replace(/^["']|["']$/g, "")
      : null;

  const result: EvalConfig = {
    judgeModel: {
      provider: scalar(values.get("judge_model.provider"), defaults.judgeModel.provider),
      model: scalar(values.get("judge_model.model"), defaults.judgeModel.model),
      modelFamily: scalar(values.get("judge_model.model_family"), defaults.judgeModel.modelFamily),
      promptTemplateVersion: scalar(values.get("judge_model.prompt_template_version"), defaults.judgeModel.promptTemplateVersion),
      localEndpoint: scalar(values.get("judge_model.local_endpoint"), defaults.judgeModel.localEndpoint ?? ""),
    },
    goldenSets: {
      default: scalar(values.get("golden_sets.default"), defaults.goldenSets.default),
      perRole: {
        sales: scalar(values.get("golden_sets.per_role.sales"), defaults.goldenSets.perRole.sales),
        support: scalar(values.get("golden_sets.per_role.support"), defaults.goldenSets.perRole.support),
        finance: scalar(values.get("golden_sets.per_role.finance"), defaults.goldenSets.perRole.finance),
        ops: scalar(values.get("golden_sets.per_role.ops"), defaults.goldenSets.perRole.ops),
      },
    },
    scorers: {
      l1Capability: parseList(values.get("scorers.l1_capability")).length ? parseList(values.get("scorers.l1_capability")) : defaults.scorers.l1Capability,
      l2Quality: parseList(values.get("scorers.l2_quality")).length ? parseList(values.get("scorers.l2_quality")) : defaults.scorers.l2Quality,
      l3Outcome: parseList(values.get("scorers.l3_outcome")).length ? parseList(values.get("scorers.l3_outcome")) : defaults.scorers.l3Outcome,
    },
    weights: {
      l1: numberValue(values.get("weights.l1"), defaults.weights.l1),
      l2: numberValue(values.get("weights.l2"), defaults.weights.l2),
      l3: numberValue(values.get("weights.l3"), defaults.weights.l3),
    },
    weightPresets,
    activePreset,
    driftGuard: {
      goldenAgreementFloor: numberValue(values.get("drift_guard.golden_agreement_floor"), defaults.driftGuard.goldenAgreementFloor),
      judgeRotationRequiresRebaseline: bool(
        values.get("drift_guard.judge_rotation_requires_rebaseline"),
        defaults.driftGuard.judgeRotationRequiresRebaseline
      ),
    },
    seal: {
      reflectionThreshold: numberValue(values.get("seal.reflection_threshold"), defaults.seal.reflectionThreshold),
      autoApply: bool(values.get("seal.auto_apply"), defaults.seal.autoApply),
      proposalTypes: parseList(values.get("seal.proposal_types")).length
        ? parseList(values.get("seal.proposal_types"))
        : defaults.seal.proposalTypes,
    },
    agents,
    publicApi: {
      rateLimit: {
        requestsPerMinute: numberValue(
          values.get("public_api.rate_limit.requests_per_minute"),
          defaults.publicApi?.rateLimit.requestsPerMinute ?? 60
        ),
        burst: numberValue(
          values.get("public_api.rate_limit.burst"),
          defaults.publicApi?.rateLimit.burst ?? 10
        ),
      },
    },
    companies: Object.keys(companies).length > 0 ? companies : defaults.companies,
    businessOps: {
      poll_interval_seconds: numberValue(
        values.get("business_ops.poll_interval_seconds"),
        defaults.businessOps.poll_interval_seconds
      ),
      correlation_id_field: scalar(
        values.get("business_ops.correlation_id_field"),
        defaults.businessOps.correlation_id_field
      ),
    },
    finance: {
      enabled: bool(values.get("finance.enabled"), defaults.finance.enabled),
      transactionLabel: scalar(values.get("finance.transaction_label"), defaults.finance.transactionLabel),
      reconciliationLabel: scalar(values.get("finance.reconciliation_label"), defaults.finance.reconciliationLabel),
      exceptionLabel: scalar(values.get("finance.exception_label"), defaults.finance.exceptionLabel),
      goldenSet: scalar(values.get("finance.golden_set"), defaults.finance.goldenSet),
    },
    compliance: {
      dataResidency: {
        enabled: bool(
          values.get("compliance.data_residency_enabled"),
          defaults.compliance.dataResidency.enabled
        ),
        allowedLocalHosts: parseList(values.get("compliance.allowed_local_hosts")).length
          ? parseList(values.get("compliance.allowed_local_hosts"))
          : defaults.compliance.dataResidency.allowedLocalHosts,
      },
      auditRetentionDays: numberValue(
        values.get("compliance.audit_retention_days"),
        defaults.compliance.auditRetentionDays
      ),
      enabledAdapters: parseList(values.get("compliance.adapters_enabled")).length
        ? parseList(values.get("compliance.adapters_enabled"))
        : defaults.compliance.enabledAdapters,
    },
    cove: {
      enabled: bool(values.get("cove.enabled"), defaults.cove.enabled),
      maxVerificationQuestions: Math.max(
        1,
        Math.min(
          12,
          numberValue(values.get("cove.max_verification_questions"), defaults.cove.maxVerificationQuestions)
        )
      ),
      parallelVerification: bool(values.get("cove.parallel_verification"), defaults.cove.parallelVerification),
      judgeEndpoint: scalar(values.get("cove.judge_endpoint"), defaults.cove.judgeEndpoint ?? ""),
    },
  };

  // Validate company sub-weights on load (throws with actionable message on violation)
  for (const [companyId, companyConfig] of Object.entries(result.companies)) {
    validateCompanySubWeights(companyId, companyConfig);
  }

  return result;
}

export function formatEvalConfigYaml(config: EvalConfig): string {
  const roleEntries = Object.entries(config.goldenSets.perRole);
  const agentEntries = Object.entries(config.agents);
  const presetEntries = Object.entries(config.weightPresets ?? {});
  return [
    "judge_model:",
    `  provider: ${config.judgeModel.provider}`,
    `  model: ${config.judgeModel.model}`,
    `  model_family: ${config.judgeModel.modelFamily}`,
    `  prompt_template_version: ${config.judgeModel.promptTemplateVersion}`,
    ...(config.judgeModel.localEndpoint ? [`  local_endpoint: ${config.judgeModel.localEndpoint}`] : []),
    "",
    "golden_sets:",
    `  default: ${config.goldenSets.default}`,
    "  per_role:",
    ...roleEntries.map(([role, goldenSet]) => `    ${role}: ${goldenSet}`),
    "",
    "scorers:",
    `  l1_capability: [${config.scorers.l1Capability.join(", ")}]`,
    `  l2_quality: [${config.scorers.l2Quality.join(", ")}]`,
    `  l3_outcome: [${config.scorers.l3Outcome.join(", ")}]`,
    "",
    "weights:",
    `  l1: ${config.weights.l1}`,
    `  l2: ${config.weights.l2}`,
    `  l3: ${config.weights.l3}`,
    "",
    "weight_presets:",
    ...(presetEntries.length
      ? presetEntries.map(([name, w]) => `  ${name}: { l1: ${w.l1}, l2: ${w.l2}, l3: ${w.l3} }`)
      : ["  # no presets defined"]),
    "",
    `active_preset: ${config.activePreset === null || config.activePreset === undefined ? "null" : config.activePreset}`,
    "",
    "drift_guard:",
    `  golden_agreement_floor: ${config.driftGuard.goldenAgreementFloor}`,
    `  judge_rotation_requires_rebaseline: ${config.driftGuard.judgeRotationRequiresRebaseline}`,
    "",
    "seal:",
    `  reflection_threshold: ${config.seal.reflectionThreshold}`,
    `  auto_apply: ${config.seal.autoApply}`,
    `  proposal_types: [${config.seal.proposalTypes.join(", ")}]`,
    "",
    "agents:",
    ...(agentEntries.length
      ? agentEntries.flatMap(([agentId, override]) => [
          `  ${agentId}:`,
          "    eval:",
          override.eval?.goldenSet ? `      golden_set: ${override.eval.goldenSet}` : "      golden_set: ''",
          override.eval?.weights ? `      weights: { l1: ${override.eval.weights.l1 ?? ""}, l2: ${override.eval.weights.l2 ?? ""}, l3: ${override.eval.weights.l3 ?? ""} }` : "      weights: {}",
        ])
      : ["  # per-agent overrides can be added here"]),
    "",
    "business_ops:",
    `  poll_interval_seconds: ${config.businessOps?.poll_interval_seconds ?? 300}`,
    `  correlation_id_field: ${config.businessOps?.correlation_id_field ?? "kitchen_correlation_id"}`,
    "",
    "finance:",
    `  enabled: ${config.finance?.enabled ?? false}`,
    `  transaction_label: ${config.finance?.transactionLabel ?? "transaction"}`,
    `  reconciliation_label: ${config.finance?.reconciliationLabel ?? "reconciliation"}`,
    `  exception_label: ${config.finance?.exceptionLabel ?? "exception"}`,
    `  golden_set: ${config.finance?.goldenSet ?? "./golden-sets/finance-reconciliation.jsonl"}`,
    "",
    "compliance:",
    `  data_residency_enabled: ${config.compliance?.dataResidency.enabled ?? false}`,
    `  audit_retention_days: ${config.compliance?.auditRetentionDays ?? 365}`,
    `  allowed_local_hosts: [${(config.compliance?.dataResidency.allowedLocalHosts ?? ["localhost", "127.0.0.1", "::1", "host.docker.internal", "ollama", "vllm"]).join(", ")}]`,
    `  adapters_enabled: [${(config.compliance?.enabledAdapters ?? ["hubspot", "intercom", "quickbooks", "bank_reconciliation"]).join(", ")}]`,
    "",
    "cove:",
    `  enabled: ${config.cove?.enabled ?? false}`,
    `  max_verification_questions: ${config.cove?.maxVerificationQuestions ?? 4}`,
    `  parallel_verification: ${config.cove?.parallelVerification ?? true}`,
    ...(config.cove?.judgeEndpoint ? [`  judge_endpoint: ${config.cove.judgeEndpoint}`] : []),
    "",
    "companies:",
    ...(Object.entries(config.companies ?? {}).length > 0
      ? Object.entries(config.companies ?? {}).flatMap(([companyId, company]) => [
          `  ${companyId}:`,
          "    l3_sub_weights:",
          `      completion_rate: ${company.l3_sub_weights.completion_rate}`,
          `      escalation_rate: ${company.l3_sub_weights.escalation_rate}`,
          `      ttr_p50: ${company.l3_sub_weights.ttr_p50}`,
          `      operator_approval_rate: ${company.l3_sub_weights.operator_approval_rate}`,
          `      cost_per_task: ${company.l3_sub_weights.cost_per_task}`,
        ])
      : ["  # per-company L3 weight overrides can be added here"]),
    "",
  ].join("\n");
}

export function evalConfigPath(): string {
  return resolveFromRepoRoot(EVAL_CONFIG_PATH);
}

export function loadEvalConfig(): EvalConfig {
  const filename = evalConfigPath();
  if (!fs.existsSync(filename)) return buildDefaultEvalConfig();
  return parseEvalConfigYaml(fs.readFileSync(filename, "utf8"));
}

export function saveEvalConfig(config: EvalConfig): EvalConfig {
  const filename = evalConfigPath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, formatEvalConfigYaml(config));
  return config;
}

export function hashEvalConfig(config: EvalConfig): string {
  return crypto.createHash("sha256").update(formatEvalConfigYaml(config)).digest("hex");
}

export function weightsForAgent(config: EvalConfig, agentId: string): EvalWeights {
  // When an active preset is set, it overrides all manual and per-agent weights.
  // This is an operator-level global override; per-agent customization requires
  // clearing active_preset first.
  const baseWeights = resolveWeights(config);

  if (config.activePreset) {
    // Preset already normalized by author; return as-is.
    return baseWeights;
  }

  const override = config.agents[agentId]?.eval?.weights ?? {};
  let l1 = override.l1 ?? baseWeights.l1;
  let l2 = override.l2 ?? baseWeights.l2;
  let l3 = override.l3 ?? baseWeights.l3;

  // Normalize so that partial per-agent overrides always sum to 1.0
  const sum = l1 + l2 + l3;
  if (sum > 0 && Math.abs(sum - 1) > 1e-9) {
    l1 = l1 / sum;
    l2 = l2 / sum;
    l3 = l3 / sum;
  }

  return { l1, l2, l3 };
}

/**
 * Updates active_preset in memroos.eval.yaml on disk.
 * Pass null to revert to manual weights.
 */
export function setActivePreset(name: string | null): EvalConfig {
  const config = loadEvalConfig();
  const updated: EvalConfig = { ...config, activePreset: name };
  return saveEvalConfig(updated);
}
