// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root: string;
let proposalsPath: string;
let skillsPath: string;
let agentsPath: string;
let cronLogPath: string;

const proposalFilename = "APO_PROPOSAL_ceo_ceo_20260505_120000.md";
const proposalBody = `# Agent-Lightning APO Proposal
**Generated:** 2026-05-05T12:00:00
**Skill:** ceo

## Proposed Fix

**APO Constraint to add to SKILL.md:**
\`\`\`
CRITICAL: Check provider auth before retrying blocked work.
\`\`\`
`;

async function loadRoute() {
  vi.resetModules();
  vi.stubEnv("APO_PROPOSALS_PATH", proposalsPath);
  vi.stubEnv("APO_SKILLS_PATH", skillsPath);
  vi.stubEnv("APO_AGENT_CONFIGS_PATH", agentsPath);
  vi.stubEnv("APO_CRON_LOG_PATH", cronLogPath);
  return import("../route");
}

function makeApproveRequest(body: unknown, url = "http://localhost/api/apo") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/apo approve", () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "apo-route-"));
    proposalsPath = path.join(root, "proposals");
    skillsPath = path.join(root, "skills");
    agentsPath = path.join(root, "agents");
    cronLogPath = path.join(root, "apo.log");
    mkdirSync(proposalsPath, { recursive: true });
    mkdirSync(path.join(skillsPath, "ceo"), { recursive: true });
    writeFileSync(path.join(proposalsPath, proposalFilename), proposalBody);
    writeFileSync(path.join(skillsPath, "ceo", "SKILL.md"), "# CEO Skill\n");
    writeFileSync(cronLogPath, "[2026-05-05 12:00:00] APO cycle\n");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("appends the APO constraint to the target skill and archives the proposal", async () => {
    const { POST } = await loadRoute();

    const response = await POST(makeApproveRequest({ action: "approve", proposalId: proposalFilename }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, proposalId: proposalFilename, skillId: "ceo", archived: true, applied: true });
    expect(readFileSync(path.join(skillsPath, "ceo", "SKILL.md"), "utf-8")).toContain(
      "CRITICAL: Check provider auth before retrying blocked work."
    );
    expect(existsSync(path.join(proposalsPath, proposalFilename))).toBe(false);
    expect(existsSync(path.join(proposalsPath, "archived", proposalFilename))).toBe(true);
  });

  it("rejects invalid proposal ids before touching the filesystem", async () => {
    const { POST } = await loadRoute();

    const response = await POST(makeApproveRequest({ action: "approve", proposalId: "../escape.md" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(existsSync(path.join(proposalsPath, proposalFilename))).toBe(true);
  });

  it("falls back to a matching PMO-style AGENTS.md when SKILL.md does not exist", async () => {
    const staffProposal = "APO_PROPOSAL_chief-of-staff_chief-of-staff_20260505_120000.md";
    rmSync(path.join(skillsPath, "ceo"), { recursive: true, force: true });
    mkdirSync(path.join(agentsPath, "chief_of_staff"), { recursive: true });
    writeFileSync(path.join(proposalsPath, staffProposal), proposalBody.replace("ceo", "chief-of-staff"));
    writeFileSync(path.join(agentsPath, "chief_of_staff", "AGENTS.md"), "# Chief of Staff Agent\n");
    const { POST } = await loadRoute();

    const response = await POST(makeApproveRequest({ action: "approve", proposalId: staffProposal }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, proposalId: staffProposal, skillId: "chief-of-staff", targetKind: "agent" });
    expect(readFileSync(path.join(agentsPath, "chief_of_staff", "AGENTS.md"), "utf-8")).toContain(
      "CRITICAL: Check provider auth before retrying blocked work."
    );
  });
});
