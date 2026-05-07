import { verifyAgentOnboardingToken } from "@/lib/agent-onboarding";

export const dynamic = "force-dynamic";

const SCRIPT = String.raw`#!/usr/bin/env bash
set -euo pipefail

TOKEN="__TOKEN__"
KITCHEN_URL="__KITCHEN_URL__"

AGENT_ID=""
AGENT_NAME=""
AGENT_ROLE=""
PLATFORM=""
PROTOCOL="rest"
LOCATION="local"
MCP_TARGET="\${AGENT_KITCHEN_MCP_TARGET:-auto}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --id) AGENT_ID="\${2:?--id requires a value}"; shift 2 ;;
    --name) AGENT_NAME="\${2:?--name requires a value}"; shift 2 ;;
    --role) AGENT_ROLE="\${2:?--role requires a value}"; shift 2 ;;
    --platform) PLATFORM="\${2:?--platform requires a value}"; shift 2 ;;
    --protocol) PROTOCOL="\${2:?--protocol requires a value}"; shift 2 ;;
    --location) LOCATION="\${2:?--location requires a value}"; shift 2 ;;
    --mcp-target) MCP_TARGET="\${2:?--mcp-target requires a value}"; shift 2 ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$AGENT_ID" || -z "$AGENT_NAME" || -z "$AGENT_ROLE" || -z "$PLATFORM" ]]; then
  echo "Usage: onboard --id <id> --name <name> --role <role> --platform <chatgpt|codex|claude|openclaw|hermes|gemini|qwen> [--mcp-target auto|stdout|codex|claude|gemini|qwen|openclaw|hermes|none|file:/path]" >&2
  exit 2
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for Agent Kitchen onboarding" >&2
  exit 1
fi

payload="$(python3 - "$TOKEN" "$AGENT_ID" "$AGENT_NAME" "$AGENT_ROLE" "$PLATFORM" "$PROTOCOL" "$LOCATION" <<'PY'
import json
import sys

token, agent_id, name, role, platform, protocol, location = sys.argv[1:]
print(json.dumps({
    "token": token,
    "id": agent_id,
    "name": name,
    "role": role,
    "platform": platform,
    "protocol": protocol,
    "location": location,
    "issueApiKey": True,
}))
PY
)"

response="$(curl -fsSL "\${KITCHEN_URL}/api/onboarding/register" \
  -H 'Content-Type: application/json' \
  -d "$payload")"

mkdir -p "$HOME/.agent-kitchen"
chmod 700 "$HOME/.agent-kitchen"

python3 - "$response" "$AGENT_ID" "$MCP_TARGET" "$PLATFORM" <<'PY'
import json
import os
import pathlib
import shutil
import stat
import subprocess
import sys

body = json.loads(sys.argv[1])
agent_id = sys.argv[2]
target = sys.argv[3]
platform = sys.argv[4]
if not body.get("ok"):
    raise SystemExit(body.get("error", "Agent Kitchen onboarding failed"))

home = pathlib.Path.home()
state_dir = home / ".agent-kitchen"
env_path = state_dir / f"{agent_id}.env"
api_key = body.get("apiKey", "")
env_path.write_text(
    f"KITCHEN_URL={body['env']['KITCHEN_URL']}\n"
    f"KITCHEN_AGENT_ID={body['env']['KITCHEN_AGENT_ID']}\n"
    f"KITCHEN_AGENT_API_KEY={api_key}\n",
    encoding="utf-8",
)
env_path.chmod(stat.S_IRUSR | stat.S_IWUSR)

mcp = body["mcp"]
mcp_url = mcp["mcpServers"]["agentkitchen"]["url"]
generic_entry = {"url": mcp_url}
http_entry = {"type": "http", "url": mcp_url}
streamable_entry = {"url": mcp_url, "transport": "streamable-http"}
http_url_entry = {"httpUrl": mcp_url}
report = {"agentId": agent_id, "platform": platform, "target": target, "actions": []}

def remember(action, status, detail):
    report["actions"].append({"action": action, "status": status, "detail": detail})

def run_if_available(binary, args):
    if not shutil.which(binary):
        remember(binary, "missing", f"{binary} not found on PATH")
        return False
    result = subprocess.run([binary, *args], text=True, capture_output=True)
    if result.returncode == 0:
        remember(binary, "ok", " ".join([binary, *args]))
        return True
    detail = (result.stderr or result.stdout or "").strip()[:500]
    remember(binary, "failed", detail)
    return False

def deep_merge(left, right):
    merged = dict(left)
    for key, value in right.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged

def merge_json(path, update):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            backup = path.with_suffix(path.suffix + ".agent-kitchen-backup")
            backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
            existing = {}
    else:
        existing = {}
    path.write_text(json.dumps(deep_merge(existing, update), indent=2) + "\n", encoding="utf-8")
    remember("write-json", "ok", str(path))

def merge_hermes_yaml(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        import yaml  # type: ignore
    except Exception:
        if not path.exists():
            path.write_text(f"mcp_servers:\n  agentkitchen:\n    url: {json.dumps(mcp_url)}\n", encoding="utf-8")
            remember("write-hermes-yaml", "ok", str(path))
        else:
            sidecar = path.parent / "agent-kitchen.mcp.yaml"
            sidecar.write_text(f"mcp_servers:\n  agentkitchen:\n    url: {json.dumps(mcp_url)}\n", encoding="utf-8")
            remember("write-hermes-yaml", "fallback", f"Wrote {sidecar}; install PyYAML for safe merge into {path}")
        return

    data = {}
    if path.exists():
        loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
        data = loaded if isinstance(loaded, dict) else {}
    servers = data.setdefault("mcp_servers", {})
    servers["agentkitchen"] = {"url": mcp_url}
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    remember("write-hermes-yaml", "ok", str(path))

def install_claude():
    return run_if_available("claude", ["mcp", "add", "--transport", "http", "agentkitchen", "--scope", "user", mcp_url])

def install_gemini():
    if run_if_available("gemini", ["mcp", "add", "--scope", "user", "--transport", "http", "agentkitchen", mcp_url]):
        return True
    merge_json(home / ".gemini" / "settings.json", {"mcpServers": {"agentkitchen": http_url_entry}})
    return True

def install_qwen():
    if run_if_available("qwen", ["mcp", "add", "--scope", "user", "--transport", "http", "agentkitchen", mcp_url]):
        return True
    merge_json(home / ".qwen" / "settings.json", {"mcpServers": {"agentkitchen": http_url_entry}})
    return True

def install_openclaw():
    if run_if_available("openclaw", ["mcp", "set", "agentkitchen", json.dumps(streamable_entry)]):
        return True
    merge_json(home / ".openclaw" / "openclaw.json", {"mcp": {"servers": {"agentkitchen": streamable_entry}}})
    return True

def install_hermes():
    merge_hermes_yaml(home / ".hermes" / "config.yaml")
    return True

def install_codex():
    merge_json(home / ".codex" / "mcp.json", {"mcpServers": {"agentkitchen": generic_entry}})
    return True

def install_file(path_value):
    path = pathlib.Path(path_value).expanduser()
    merge_json(path, {"mcpServers": {"agentkitchen": generic_entry}})
    return True

def install_explicit(selected):
    if selected == "none":
        remember("mcp-target", "skipped", "none")
        return True
    if selected == "stdout":
        print(json.dumps(mcp, indent=2))
        remember("mcp-target", "ok", "stdout")
        return True
    if selected.startswith("file:"):
        return install_file(selected[5:])
    installers = {
        "codex": install_codex,
        "claude": install_claude,
        "gemini": install_gemini,
        "qwen": install_qwen,
        "openclaw": install_openclaw,
        "hermes": install_hermes,
    }
    installer = installers.get(selected)
    if installer is None:
        raise SystemExit(f"Unknown --mcp-target {selected}")
    return installer()

def install_auto():
    platform_targets = {
        "chatgpt": "stdout",
        "codex": "codex",
        "claude": "claude",
        "gemini": "gemini",
        "qwen": "qwen",
        "openclaw": "openclaw",
        "opencode": "openclaw",
        "hermes": "hermes",
    }
    return install_explicit(platform_targets.get(platform, "stdout"))

if target == "auto":
    install_auto()
elif target == "none":
    pass
else:
    install_explicit(target)

report_path = state_dir / f"{agent_id}.onboarding-report.json"
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print(f"Agent Kitchen onboarded {agent_id}")
print(f"Credentials written to {env_path}")
print(f"Onboarding report written to {report_path}")
PY
`;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = verifyAgentOnboardingToken(token);
  if (!verified.ok) {
    return new Response(verified.error, { status: 403, headers: { "content-type": "text/plain" } });
  }

  return new Response(
    SCRIPT.replace("__TOKEN__", token).replace("__KITCHEN_URL__", verified.payload.kitchenUrl),
    { headers: { "content-type": "text/x-shellscript; charset=utf-8" } }
  );
}
