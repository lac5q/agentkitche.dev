import { describe, expect, it } from "vitest";
import { summarizeAgentCliProcesses } from "../local-agent-runtime";

describe("local agent runtime process summary", () => {
  it("counts CLI session roots without double-counting helper children", () => {
    const summary = summarizeAgentCliProcesses(
      [
        " 4068  1166 node /opt/homebrew/bin/qwen",
        " 4087  4068 /opt/homebrew/Cellar/node/25.8.2/bin/node /opt/homebrew/bin/qwen",
        " 4217  1222 node /opt/homebrew/bin/qwen",
        " 4228  4217 /opt/homebrew/Cellar/node/25.8.2/bin/node /opt/homebrew/bin/qwen",
        " 2397  2353 zsh -c while true; do /Users/lcalderon/.local/bin/claude; done",
        " 2432  2397 /Users/lcalderon/.local/bin/claude --channels plugin:discord",
        " 2003     1 /opt/homebrew/Cellar/python@3.11/3.11.14_3/Frameworks/Python.framework/Versions/3.11/Resources/Python.app/Contents/MacOS/Python -m hermes_cli.main gateway run --replace",
        " 1134   641 /Applications/Codex.app/Contents/Resources/codex app-server --analytics-default-enabled",
      ].join("\n"),
      "2026-05-07T07:45:00.000Z"
    );

    expect(summary).toEqual({
      activeCliCount: 4,
      byPlatform: {
        claude: 1,
        hermes: 1,
        qwen: 2,
      },
      scannedAt: "2026-05-07T07:45:00.000Z",
    });
  });
});
