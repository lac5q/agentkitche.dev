import fs from "fs";
import path from "path";

export interface RuntimeOutcome {
  timestamp: string;
  tool: string;
  success: boolean;
  errorType?: string | null;
  duration_ms: number;
}

function readJsonl(filePath: string): RuntimeOutcome[] {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RuntimeOutcome);
  } catch {
    return [];
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

function healthScore(outcomes: RuntimeOutcome[]): { score: number; reason: string } {
  if (outcomes.length === 0) return { score: 100, reason: "No recent tool failures" };
  const failures = outcomes.filter((outcome) => !outcome.success).length;
  const avgDuration = outcomes.reduce((sum, outcome) => sum + outcome.duration_ms, 0) / outcomes.length;
  const score = Math.max(0, Math.round(100 - failures * 18 - Math.max(0, avgDuration - 500) / 50));
  const reason = score < 50 ? `${failures} tool failures or slow calls in recent session` : "Runtime health within budget";
  return { score, reason };
}

export function buildObservabilityModel(hermesRoot: string) {
  const outcomes = readJsonl(path.join(hermesRoot, "logs", "tool-outcomes.jsonl"));
  const sessions = outcomes.slice(-20).map((outcome, index) => {
    const health = healthScore([outcome]);
    return {
      id: `session-${index + 1}`,
      startedAt: outcome.timestamp,
      tool: outcome.tool,
      events: [outcome],
      tokens: 0,
      health,
    };
  });
  const errors = outcomes.filter((outcome) => !outcome.success);
  const byTool = outcomes.reduce<Record<string, { total: number; errors: number }>>((acc, outcome) => {
    acc[outcome.tool] ??= { total: 0, errors: 0 };
    acc[outcome.tool].total += 1;
    if (!outcome.success) acc[outcome.tool].errors += 1;
    return acc;
  }, {});

  return {
    sessions,
    summary: {
      sessions: sessions.length,
      toolCalls: outcomes.length,
      errors: errors.length,
      errorRate: outcomes.length ? errors.length / outcomes.length : 0,
      byTool,
    },
  };
}

export function renderObservabilityHtml(hermesRoot: string): string {
  const model = buildObservabilityModel(hermesRoot);
  const rows = model.sessions.map((session) => `
    <button class="session" onclick="selectSession('${session.id}')">
      <span>${escapeHtml(session.id)}</span>
      <strong>${session.health.score}</strong>
      <small>${escapeHtml(session.tool)} · ${escapeHtml(session.startedAt)}</small>
    </button>
  `).join("");
  const data = JSON.stringify(model).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hermes Runtime Observability</title>
  <style>
    body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    main{display:grid;grid-template-columns:320px 1fr;gap:24px;min-height:100vh;padding:24px}
    .panel{border:1px solid #334155;background:#111827;padding:16px}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    .stat{border:1px solid #334155;padding:12px;background:#0b1120}
    .session{display:grid;width:100%;gap:4px;margin:8px 0;border:1px solid #334155;background:#0b1120;color:#e2e8f0;padding:10px;text-align:left}
    .timeline{margin-top:16px;border-left:2px solid #38bdf8;padding-left:16px}
    code{color:#fbbf24}
  </style>
</head>
<body>
  <main>
    <aside class="panel">
      <h1>Runtime Sessions</h1>
      <p>Offline static dashboard from Hermes logs.</p>
      ${rows || "<p>No sessions yet.</p>"}
    </aside>
    <section class="panel">
      <div class="stats">
        <div class="stat"><small>Sessions</small><h2>${model.summary.sessions}</h2></div>
        <div class="stat"><small>Tool Calls</small><h2>${model.summary.toolCalls}</h2></div>
        <div class="stat"><small>Errors</small><h2>${model.summary.errors}</h2></div>
        <div class="stat"><small>Error Rate</small><h2>${Math.round(model.summary.errorRate * 100)}%</h2></div>
      </div>
      <div id="detail" class="timeline">Select a session to inspect timeline events.</div>
    </section>
  </main>
  <script>
    const model = ${data};
    function selectSession(id) {
      const session = model.sessions.find((item) => item.id === id);
      if (!session) return;
      document.getElementById('detail').innerHTML = '<h2>' + session.id + '</h2>' +
        '<p>Health <code>' + session.health.score + '</code>: ' + session.health.reason + '</p>' +
        session.events.map((event) => '<p><strong>' + event.tool + '</strong> ' + (event.success ? 'succeeded' : 'failed') + ' in ' + event.duration_ms + 'ms</p>').join('');
    }
  </script>
</body>
</html>`;
}

export function writeObservabilityDashboard(hermesRoot: string, outputPath = path.join(hermesRoot, "observability", "index.html")): string {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderObservabilityHtml(hermesRoot));
  return outputPath;
}
