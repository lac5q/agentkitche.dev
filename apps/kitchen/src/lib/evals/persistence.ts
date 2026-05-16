import type Database from "better-sqlite3";

import type { EvalRunResult } from "./types";

export function ensureEvalTables(db: Database.Database): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS eval_runs (" +
    "  id                       TEXT PRIMARY KEY," +
    "  trace_id                 TEXT NOT NULL," +
    "  agent_id                 TEXT NOT NULL," +
    "  role                     TEXT NOT NULL," +
    "  composite_w              REAL NOT NULL," +
    "  trusted                  INTEGER NOT NULL," +
    "  drift_agreement          REAL NOT NULL," +
    "  drift_status             TEXT NOT NULL," +
    "  layer_breakdown_json     TEXT NOT NULL," +
    "  scorer_results_json      TEXT NOT NULL," +
    "  judge_provider           TEXT NOT NULL," +
    "  judge_model              TEXT NOT NULL," +
    "  judge_model_family       TEXT NOT NULL," +
    "  prompt_template_version  TEXT NOT NULL," +
    "  prompt_hash              TEXT NOT NULL," +
    "  golden_set_path          TEXT NOT NULL," +
    "  golden_set_version       TEXT NOT NULL," +
    "  config_hash              TEXT NOT NULL," +
    "  started_at               TEXT NOT NULL," +
    "  completed_at             TEXT NOT NULL," +
    "  judge_score_json         TEXT" +
    ");" +
    "CREATE INDEX IF NOT EXISTS eval_runs_completed" +
    "  ON eval_runs(completed_at DESC);" +
    "CREATE INDEX IF NOT EXISTS eval_runs_agent" +
    "  ON eval_runs(agent_id, completed_at DESC);" +
    "CREATE TABLE IF NOT EXISTS eval_run_examples (" +
    "  id            INTEGER PRIMARY KEY," +
    "  run_id        TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE," +
    "  example_id    TEXT NOT NULL," +
    "  human_score   REAL NOT NULL," +
    "  judge_score   REAL NOT NULL," +
    "  agreed        INTEGER NOT NULL," +
    "  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))" +
    ");" +
    "CREATE INDEX IF NOT EXISTS eval_run_examples_run" +
    "  ON eval_run_examples(run_id);"
  );

  // Additive migration: add judge_score_json column if it doesn't exist yet (legacy DBs)
  try {
    db.exec("ALTER TABLE eval_runs ADD COLUMN judge_score_json TEXT");
  } catch {
    // Column already exists — safe to ignore
  }
}

export function persistEvalRun(db: Database.Database, run: EvalRunResult): void {
  ensureEvalTables(db);
  const insertExample = db.prepare(
    "INSERT INTO eval_run_examples (run_id, example_id, human_score, judge_score, agreed)" +
    " VALUES (?, ?, ?, ?, ?)"
  );

  db.transaction(() => {
    db.prepare(
      "INSERT INTO eval_runs (" +
      "  id, trace_id, agent_id, role, composite_w, trusted, drift_agreement, drift_status," +
      "  layer_breakdown_json, scorer_results_json, judge_provider, judge_model, judge_model_family," +
      "  prompt_template_version, prompt_hash, golden_set_path, golden_set_version, config_hash," +
      "  started_at, completed_at, judge_score_json" +
      ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      run.id,
      run.traceId,
      run.agentId,
      run.role,
      run.compositeW,
      run.trusted ? 1 : 0,
      run.driftGuard.agreement,
      run.driftGuard.status,
      JSON.stringify(run.layers),
      JSON.stringify(run.scorerResults),
      run.judge.provider,
      run.judge.model,
      run.judge.modelFamily,
      run.judge.promptTemplateVersion,
      run.judge.promptHash,
      run.goldenSetPath,
      run.driftGuard.goldenSetVersion,
      run.configHash,
      run.startedAt,
      run.completedAt,
      JSON.stringify({ score: run.judge.score, rubricScores: run.judge.rubricScores })
    );
    for (const example of run.driftGuard.examples) {
      insertExample.run(run.id, example.id, example.humanScore, example.judgeScore, example.agreed ? 1 : 0);
    }
  })();
}

export function listEvalRuns(db: Database.Database, limit = 25): Array<EvalRunResult & { examples: EvalRunResult["driftGuard"]["examples"] }> {
  ensureEvalTables(db);
  const rows = db.prepare(
    "SELECT * FROM eval_runs ORDER BY completed_at DESC LIMIT ?"
  ).all(limit) as Array<Record<string, unknown>>;

  const examplesQuery = db.prepare(
    "SELECT example_id, human_score, judge_score, agreed" +
    " FROM eval_run_examples" +
    " WHERE run_id = ?" +
    " ORDER BY id ASC"
  );

  return rows.map((row) => {
    const runExamples = examplesQuery.all(row.id as string) as Array<{
      example_id: string;
      human_score: number;
      judge_score: number;
      agreed: number;
    }>;
    const driftExamples = runExamples.map((example) => ({
      id: example.example_id,
      humanScore: example.human_score,
      judgeScore: example.judge_score,
      agreed: example.agreed === 1,
    }));

    // Reconstruct judge from persisted JSON when available; fall back to zeroed stubs for legacy rows
    let judgeScore = 0;
    let rubricScores = { faithful: 0, useful: 0, policy: 0 };
    if (typeof row.judge_score_json === "string" && row.judge_score_json) {
      try {
        const parsed = JSON.parse(row.judge_score_json) as { score?: number; rubricScores?: { faithful: number; useful: number; policy: number } };
        if (typeof parsed.score === "number") judgeScore = parsed.score;
        if (parsed.rubricScores) rubricScores = parsed.rubricScores;
      } catch {
        // Legacy row with malformed JSON — keep defaults
      }
    }

    return {
      id: row.id as string,
      traceId: row.trace_id as string,
      agentId: row.agent_id as string,
      role: row.role as string,
      compositeW: row.composite_w as number,
      trusted: row.trusted === 1,
      layers: JSON.parse(row.layer_breakdown_json as string),
      scorerResults: JSON.parse(row.scorer_results_json as string),
      judge: {
        provider: row.judge_provider as string,
        model: row.judge_model as string,
        modelFamily: row.judge_model_family as string,
        promptTemplateVersion: row.prompt_template_version as string,
        promptHash: row.prompt_hash as string,
        score: judgeScore,
        rubricScores,
        positionBiasMitigation: { swapAugmentation: true, orderAgreement: true },
      },
      driftGuard: {
        status: row.drift_status as "passed" | "halted",
        agreement: row.drift_agreement as number,
        floor: 0.85,
        goldenSetVersion: row.golden_set_version as string,
        examples: driftExamples,
      },
      configHash: row.config_hash as string,
      goldenSetPath: row.golden_set_path as string,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string,
      examples: driftExamples,
    };
  });
}
