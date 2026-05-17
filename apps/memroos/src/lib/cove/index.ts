import type { AgentEvalTrace, EvalScorer, EvalScorerResult } from "@/lib/evals/types";

export type CoveClient = (prompt: string) => Promise<string>;

export interface CoveRuntimeConfig {
  enabled: boolean;
  maxVerificationQuestions: number;
  parallelVerification: boolean;
  judgeEndpoint?: string;
  client?: CoveClient;
}

export interface CoveFactCheck {
  question: string;
  answer: string;
}

export interface CoveTrace {
  input: string;
  draft: string;
  questions: string[];
  factChecks: CoveFactCheck[];
  revisedAnswer: string;
}

export interface CovePipelineResult {
  revisedAnswer: string;
  trace: CoveTrace;
}

export interface CoveWrappedResult {
  answer: string;
  trace: CoveTrace;
}

interface OpenAICompatibleClientOptions {
  endpoint: string;
  model: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseQuestions(text: string, limit: number): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, Math.max(1, limit));
}

function endpointForChatCompletions(endpoint: string): string {
  const clean = endpoint.replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/chat/completions`;
}

export function createOpenAICompatibleCoveClient(options: OpenAICompatibleClientOptions): CoveClient {
  return async (prompt: string) => {
    const fetcher = options.fetchImpl ?? fetch;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.apiKey) headers.Authorization = `Bearer ${options.apiKey}`;

    const response = await fetcher(endpointForChatCompletions(options.endpoint), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`CoVe provider failed: ${response.status}`);
    }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content ?? "";
  };
}

export async function runCovePipeline({
  input,
  draft,
  config,
  client,
}: {
  input: string;
  draft: string;
  config: CoveRuntimeConfig;
  client?: CoveClient;
}): Promise<CovePipelineResult> {
  const llm = client ?? config.client;
  if (!config.enabled || !llm) {
    return {
      revisedAnswer: draft,
      trace: { input, draft, questions: [], factChecks: [], revisedAnswer: draft },
    };
  }

  const questionText = await llm(
    `Generate verification questions for this draft answer.\nInput: ${input}\nDraft: ${draft}`
  );
  const questions = parseQuestions(questionText, config.maxVerificationQuestions);
  const checkPrompt = (question: string) =>
    `Run an independent fact-check for this verification question.\nInput: ${input}\nQuestion: ${question}`;

  const factChecks = config.parallelVerification
    ? await Promise.all(questions.map(async (question) => ({ question, answer: await llm(checkPrompt(question)) })))
    : [];

  if (!config.parallelVerification) {
    for (const question of questions) {
      factChecks.push({ question, answer: await llm(checkPrompt(question)) });
    }
  }

  const revisedAnswer = await llm(
    `Revise the draft answer using only the independent fact-check evidence.\nInput: ${input}\nDraft: ${draft}\nChecks:\n${factChecks
      .map((check) => `Q: ${check.question}\nA: ${check.answer}`)
      .join("\n\n")}\nReturn the revised answer.`
  );

  return {
    revisedAnswer,
    trace: { input, draft, questions, factChecks, revisedAnswer },
  };
}

export function cove<TArgs extends unknown[]>(
  agentFn: (...args: TArgs) => Promise<string>,
  config: CoveRuntimeConfig
): (...args: TArgs) => Promise<CoveWrappedResult> {
  return async (...args: TArgs) => {
    const input = typeof args[0] === "string" ? args[0] : JSON.stringify(args[0] ?? "");
    const draft = await agentFn(...args);
    const result = await runCovePipeline({ input, draft, config });
    return { answer: result.revisedAnswer, trace: result.trace };
  };
}

function unsupportedClaimCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function result(score: number, detail: string, metadata: Record<string, unknown>): EvalScorerResult {
  return {
    scorerId: coveHallucinationDeltaScorer.id,
    layer: coveHallucinationDeltaScorer.layer,
    score: Number(clamp01(score).toFixed(4)),
    detail,
    metadata,
  };
}

export const coveHallucinationDeltaScorer: EvalScorer = {
  id: "cove_hallucination_delta",
  label: "CoVe hallucination delta",
  layer: "l2",
  score(trace: AgentEvalTrace): EvalScorerResult {
    const coveMetadata = (trace.metadata?.cove ?? {}) as {
      baselineTrace?: AgentEvalTrace;
      unsupportedClaims?: unknown;
      corrections?: unknown;
    };
    const baselineTrace = coveMetadata.baselineTrace;
    const baselineUnsupportedClaims = unsupportedClaimCount(
      baselineTrace?.metadata?.unsupportedClaims ?? trace.metadata?.baselineUnsupportedClaims
    );
    const coveUnsupportedClaims = unsupportedClaimCount(
      coveMetadata.unsupportedClaims ?? trace.metadata?.unsupportedClaims
    );
    const corrections = unsupportedClaimCount(coveMetadata.corrections);

    if (!baselineTrace && baselineUnsupportedClaims === 0) {
      return result(0.5, "No baseline trace was provided for CoVe comparison.", {
        baselineUnsupportedClaims,
        coveUnsupportedClaims,
        corrections,
      });
    }

    const denominator = Math.max(1, baselineUnsupportedClaims);
    const reduction = (baselineUnsupportedClaims - coveUnsupportedClaims) / denominator;
    const correctionBonus = corrections > 0 ? 0.1 : 0;
    return result(
      reduction + correctionBonus,
      "CoVe hallucination delta from baseline unsupported-claim reduction.",
      { baselineUnsupportedClaims, coveUnsupportedClaims, corrections }
    );
  },
};
