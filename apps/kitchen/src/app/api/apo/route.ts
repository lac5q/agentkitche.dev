import { NextResponse } from "next/server";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "fs/promises";
import path from "path";
import type { ApoProposal, ApoCycleStats } from "@/types";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

// NOTE (OPSGW-02): process.env.HOME here causes a non-blocking Turbopack NFT warning during
// `npm run build`. The warning is benign — the build and route work correctly. Root cause:
// turbopack.root in next.config.ts covers the full monorepo, so any fs + dynamic env path
// triggers a full-project trace. Resolving it requires moving APO storage to a static subfolder.
const PROPOSALS_PATH: string =
  process.env.APO_PROPOSALS_PATH ?? `${process.env.HOME ?? "~"}/.openclaw/skills/proposals`;
const SKILLS_PATH: string =
  process.env.APO_SKILLS_PATH ?? `${process.env.HOME ?? "~"}/.openclaw/skills`;
const HOME = process.env.HOME ?? "~";
const CRON_LOG_PATH: string =
  process.env.APO_CRON_LOG_PATH ?? `${HOME}/.openclaw/logs/agent-lightning-cron.log`;

async function parseProposal(
  filePath: string,
  status: "pending" | "archived"
): Promise<ApoProposal | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const filename = path.basename(filePath);
    // Parse: APO_PROPOSAL_[skill]_[subsystem]_[timestamp].md
    const match = filename.match(
      /^APO_PROPOSAL_(.+?)_(.+?)_(\d{8}_\d{6}|\d+)\.md$/
    );
    const fileStat = await stat(filePath);

    return {
      id: filename,
      filename,
      skill: match?.[1]?.replace(/-/g, " ") || filename,
      subsystem: match?.[2]?.replace(/-/g, " ") || "unknown",
      timestamp: fileStat.mtime.toISOString(),
      content,
      status,
    };
  } catch {
    return null;
  }
}

function parseProposalFilename(filename: string): { filename: string; skillId: string } | null {
  if (filename !== path.basename(filename) || !filename.endsWith(".md")) return null;
  const match = filename.match(/^APO_PROPOSAL_(.+?)_(.+?)_(\d{8}_\d{6}|\d+)\.md$/);
  if (!match?.[1]) return null;
  return { filename, skillId: match[1] };
}

function extractConstraint(content: string): string | null {
  const match = content.match(/\*\*APO Constraint to add to SKILL\.md:\*\*\s*```(?:[a-zA-Z]*)?\s*([\s\S]*?)```/);
  const constraint = match?.[1]?.trim();
  return constraint ? constraint : null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function candidateIds(skillId: string) {
  return unique([skillId, skillId.replace(/-/g, "_"), skillId.replace(/_/g, "-")]);
}

function skillRoots() {
  return unique([
    SKILLS_PATH,
    process.env.SKILLS_PATH ?? "",
    `${HOME}/github/knowledge/skills`,
    `${HOME}/.openclaw/skills`,
    `${HOME}/.claude/skills`,
  ]);
}

function agentRoots() {
  return unique([
    process.env.APO_AGENT_CONFIGS_PATH ?? "",
    `${HOME}/github/PMO/agents`,
    `${HOME}/github/knowledge/agent-configs`,
  ]);
}

async function readFirstExisting(candidates: string[]) {
  for (const candidate of candidates) {
    const content = await readFile(candidate, "utf-8").catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    });
    if (content !== null) return { path: candidate, content };
  }
  return null;
}

async function resolveApprovalTarget(skillId: string) {
  const ids = candidateIds(skillId);
  const skillCandidates = skillRoots().flatMap((root) =>
    ids.map((id) => path.join(root, id, "SKILL.md"))
  );
  const skillTarget = await readFirstExisting(skillCandidates);
  if (skillTarget) return { ...skillTarget, kind: "skill" as const };

  const agentCandidates = [
    ...agentRoots().flatMap((root) => ids.map((id) => path.join(root, id, "AGENTS.md"))),
    path.join(HOME, "github", skillId, "AGENTS.md"),
  ];
  const agentTarget = await readFirstExisting(agentCandidates);
  if (agentTarget) return { ...agentTarget, kind: "agent" as const };

  return null;
}

async function approveProposal(filename: string) {
  const identity = parseProposalFilename(filename);
  if (!identity) {
    return { status: 400, body: { ok: false, error: "Invalid proposal id" } };
  }

  const proposalPath = path.join(PROPOSALS_PATH, identity.filename);
  const archivedPath = path.join(PROPOSALS_PATH, "archived", identity.filename);
  const content = await readFile(proposalPath, "utf-8").catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (!content) {
    return { status: 404, body: { ok: false, error: "Proposal not found" } };
  }

  const constraint = extractConstraint(content);
  if (!constraint) {
    return { status: 422, body: { ok: false, error: "Proposal has no APO constraint block" } };
  }

  const target = await resolveApprovalTarget(identity.skillId);
  if (!target) {
    return {
      status: 404,
      body: {
        ok: false,
        error: `No SKILL.md or AGENTS.md target found for ${identity.skillId}`,
        searched: {
          skillRoots: skillRoots(),
          agentRoots: agentRoots(),
        },
      },
    };
  }

  if (!target.content.includes(constraint)) {
    const approvalBlock = [
      "",
      "## APO Approved Constraint",
      "",
      `Source proposal: ${identity.filename}`,
      "",
      constraint,
      "",
    ].join("\n");
    await writeFile(target.path, `${target.content.trimEnd()}\n${approvalBlock}`, "utf-8");
  }

  await mkdir(path.dirname(archivedPath), { recursive: true });
  await rename(proposalPath, archivedPath);

  return {
    status: 200,
    body: {
      ok: true,
      proposalId: identity.filename,
      skillId: identity.skillId,
      targetPath: target.path,
      targetKind: target.kind,
      archived: true,
      applied: !target.content.includes(constraint),
      timestamp: new Date().toISOString(),
    },
  };
}

export async function GET() {
  const proposals: ApoProposal[] = [];

  // Read active proposals
  try {
    const files = await readdir(PROPOSALS_PATH);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    for (const f of mdFiles) {
      const proposal = await parseProposal(
        path.join(PROPOSALS_PATH, f),
        "pending"
      );
      if (proposal) proposals.push(proposal);
    }
  } catch {
    /* no proposals dir */
  }

  // Read archived proposals
  const archivedPath = path.join(PROPOSALS_PATH, "archived");
  try {
    const files = await readdir(archivedPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    for (const f of mdFiles) {
      const proposal = await parseProposal(
        path.join(archivedPath, f),
        "archived"
      );
      if (proposal) proposals.push(proposal);
    }
  } catch {
    /* no archived dir */
  }

  // Read recent cron log lines
  let recentLogLines: string[] = [];
  let lastRun: string | null = null;
  try {
    const log = await readFile(CRON_LOG_PATH, "utf-8");
    const lines = log.split("\n").filter((l) => l.trim());
    recentLogLines = lines.slice(-50); // last 50 lines
    // Find last run timestamp from log
    const runLines = lines.filter(
      (l) =>
        l.includes("Starting") ||
        l.includes("APO cycle") ||
        l.includes("[CRON]")
    );
    if (runLines.length > 0) {
      const lastRunLine = runLines[runLines.length - 1];
      const dateMatch = lastRunLine.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/);
      lastRun = dateMatch?.[0] || null;
    }
    if (!lastRun) {
      const logStat = await stat(CRON_LOG_PATH);
      lastRun = logStat.mtime.toISOString();
    }
  } catch {
    /* no log */
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const archived = proposals.filter((p) => p.status === "archived");

  const stats: ApoCycleStats = {
    lastRun,
    totalProposals: proposals.length,
    pendingProposals: pending.length,
    archivedProposals: archived.length,
    recentLogLines,
  };

  // Sort proposals by timestamp descending
  proposals.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return NextResponse.json({
    proposals,
    stats,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as { proposalId?: unknown; action?: unknown } | null;
  if (!body || typeof body.proposalId !== "string") {
    return NextResponse.json({ ok: false, error: "proposalId is required" }, { status: 400 });
  }
  if (body.action !== undefined && body.action !== "approve") {
    return NextResponse.json({ ok: false, error: "action must be approve" }, { status: 400 });
  }

  try {
    const result = await approveProposal(body.proposalId);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to approve proposal" },
      { status: 500 }
    );
  }
}
