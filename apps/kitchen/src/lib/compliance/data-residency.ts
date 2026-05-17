import type { EvalConfig } from "@/lib/evals/types";

const LOCAL_PROVIDERS = new Set(["ollama", "vllm", "local", "openai-compatible"]);
const DEFAULT_LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
  "ollama",
  "vllm",
]);

export interface CompliancePostureSummary {
  dataResidencyEnabled: boolean;
  judgeProvider: string;
  judgeModel: string;
  judgeModelFamily: string;
  judgeEndpoint: string | null;
  judgeEndpointLocal: boolean;
  auditRetentionDays: number;
  enabledAdapters: string[];
}

export class DataResidencyViolation extends Error {
  constructor(message: string) {
    super(`DATA_RESIDENCY_BLOCKED: ${message}`);
    this.name = "DataResidencyViolation";
  }
}

export function isLocalEndpoint(endpoint: string | null | undefined, allowedHosts: string[] = []): boolean {
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint);
    const hosts = new Set([...DEFAULT_LOCAL_HOSTS, ...allowedHosts]);
    return hosts.has(url.hostname);
  } catch {
    return false;
  }
}

export function assertJudgeResidency(config: EvalConfig): void {
  if (!config.compliance.dataResidency.enabled) return;

  const provider = config.judgeModel.provider.toLowerCase();
  if (!LOCAL_PROVIDERS.has(provider)) {
    throw new DataResidencyViolation(
      `judge provider "${config.judgeModel.provider}" is external while data residency mode is enabled`
    );
  }

  if (!isLocalEndpoint(config.judgeModel.localEndpoint, config.compliance.dataResidency.allowedLocalHosts)) {
    throw new DataResidencyViolation(
      `judge provider "${config.judgeModel.provider}" must use a configured local endpoint in data residency mode`
    );
  }
}

export function summarizeCompliancePosture(config: EvalConfig): CompliancePostureSummary {
  return {
    dataResidencyEnabled: config.compliance.dataResidency.enabled,
    judgeProvider: config.judgeModel.provider,
    judgeModel: config.judgeModel.model,
    judgeModelFamily: config.judgeModel.modelFamily,
    judgeEndpoint: config.judgeModel.localEndpoint ?? null,
    judgeEndpointLocal: isLocalEndpoint(
      config.judgeModel.localEndpoint,
      config.compliance.dataResidency.allowedLocalHosts
    ),
    auditRetentionDays: config.compliance.auditRetentionDays,
    enabledAdapters: config.compliance.enabledAdapters,
  };
}
