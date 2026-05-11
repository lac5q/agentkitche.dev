import { scanContent, type ScanMatch } from "@/lib/content-scanner";

export type IrisSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface IrisFinding {
  ruleId: string;
  category: "prompt_injection" | "secret" | "pii" | "content";
  severity: IrisSeverity;
  message: string;
  evidence?: string;
}

export interface IrisScanResult {
  blocked: boolean;
  findings: IrisFinding[];
  matches: ScanMatch[];
  cleanContent: string;
  riskScore: number;
}

const MAX_SCAN_LEN = 4096;

const IRIS_PREFLIGHT_RULES: Array<{
  ruleId: string;
  pattern: RegExp;
  severity: IrisSeverity;
  message: string;
}> = [
  {
    ruleId: "instruction_override",
    pattern: /\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|messages?|rules?|context)\b/i,
    severity: "HIGH",
    message: "Instruction override attempt",
  },
  {
    ruleId: "system_prompt_exfiltration",
    pattern: /\b(reveal|print|show|dump|exfiltrate|leak)\b[\s\S]{0,80}\b(system prompt|hidden (?:developer )?(?:message|instructions?)|internal instructions?|developer message)\b/i,
    severity: "HIGH",
    message: "System prompt or hidden instruction exfiltration attempt",
  },
  {
    ruleId: "tool_policy_bypass",
    pattern: /\b(bypass|disable|override)\b[\s\S]{0,80}\b(safety|security|policy|guardrails?|content scanner|permissions?)\b/i,
    severity: "HIGH",
    message: "Security policy bypass attempt",
  },
];

function preview(value: string): string {
  return value.slice(0, 8) + "...";
}

function categoryForContentMatch(match: ScanMatch): IrisFinding["category"] {
  if (match.patternName.includes("secret") || match.patternName.includes("token") || match.patternName.includes("key")) return "secret";
  if (match.patternName.includes("email") || match.patternName.includes("phone") || match.patternName.includes("ssn") || match.patternName.includes("credit_card")) return "pii";
  return "content";
}

function riskScore(findings: IrisFinding[]): number {
  return findings.reduce((score, finding) => {
    if (finding.severity === "HIGH") return score + 100;
    if (finding.severity === "MEDIUM") return score + 40;
    return score + 10;
  }, 0);
}

export function scanIrisPreflight(text: string): IrisScanResult {
  const safeText = text == null ? "" : String(text);
  const contentScan = scanContent(safeText);
  const findings: IrisFinding[] = contentScan.matches.map((match) => ({
    ruleId: `content.${match.patternName}`,
    category: categoryForContentMatch(match),
    severity: match.severity,
    message: `Matched existing content scanner rule: ${match.patternName}`,
    evidence: match.redacted,
  }));

  const matches: ScanMatch[] = [...contentScan.matches];

  if (safeText.length <= MAX_SCAN_LEN) {
    for (const rule of IRIS_PREFLIGHT_RULES) {
      const found = rule.pattern.exec(safeText);
      if (!found) continue;

      findings.push({
        ruleId: rule.ruleId,
        category: "prompt_injection",
        severity: rule.severity,
        message: rule.message,
        evidence: preview(found[0]),
      });
      matches.push({
        patternName: `iris.${rule.ruleId}`,
        severity: rule.severity === "LOW" ? "MEDIUM" : rule.severity,
        redacted: preview(found[0]),
      });
    }
  }

  return {
    blocked: findings.some((finding) => finding.severity === "HIGH"),
    findings,
    matches,
    cleanContent: contentScan.cleanContent,
    riskScore: riskScore(findings),
  };
}
