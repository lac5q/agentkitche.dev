"""Unified MCP server for the hybrid knowledge system.

The server is one external facade for agents. It deliberately exposes a small
core surface, then uses progressive disclosure for deeper workspaces so agents
do not start every session with a giant tool menu.
"""

from __future__ import annotations

import os
import secrets
import sys
from pathlib import Path
from typing import Optional
from urllib.parse import quote

try:
    from fastmcp.server.auth.providers.debug import DebugTokenVerifier  # type: ignore
except Exception:  # pragma: no cover - optional when FastMCP auth extras are unavailable
    DebugTokenVerifier = None  # type: ignore

try:  # FastMCP is available as either fastmcp or mcp.server.fastmcp depending on install.
    from fastmcp import FastMCP  # type: ignore
except Exception:  # pragma: no cover - environment compatibility
    try:
        from mcp.server.fastmcp import FastMCP  # type: ignore
    except Exception:  # pragma: no cover - lets smoke tests import wrappers without MCP installed
        class FastMCP:  # type: ignore[no-redef]
            def __init__(self, _name: str, *args, **kwargs):
                pass

            def tool(self):
                return lambda fn: fn

            def resource(self, _uri: str):
                return lambda fn: fn

            def prompt(self):
                return lambda fn: fn

            def run(self, *args, **kwargs):
                raise RuntimeError("FastMCP runtime is not installed")

try:
    import httpx  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    httpx = None

MEMORY_SERVICE_DIR = Path(__file__).resolve().parents[2] / "memory"
if str(MEMORY_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(MEMORY_SERVICE_DIR))

from provenance import extract_metadata, normalize_metadata, provenance_label

try:
    from .capabilities import get_capabilities, open_workspace
    from .compiler import compile_wiki
    from .store import KnowledgeStore
    from . import tool_attention
except ImportError:  # pragma: no cover - allows `python knowledge_system/mcp_server.py`
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from knowledge_system.capabilities import get_capabilities, open_workspace
    from knowledge_system.compiler import compile_wiki
    from knowledge_system.store import KnowledgeStore
    from knowledge_system import tool_attention


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer, got {raw!r}") from exc


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_transport(value: str) -> str:
    transport = value.strip().lower().replace("_", "-")
    aliases = {
        "http": "streamable-http",
        "streamable": "streamable-http",
        "streamablehttp": "streamable-http",
    }
    transport = aliases.get(transport, transport)
    if transport not in {"stdio", "sse", "streamable-http"}:
        raise ValueError("KITCHEN_MCP_TRANSPORT must be one of: stdio, sse, streamable-http")
    return transport


def _server_transport() -> str:
    return _normalize_transport(os.environ.get("KITCHEN_MCP_TRANSPORT", "stdio"))


def _server_options() -> dict:
    """Return FastMCP options controlled by env for local or remote clients."""
    return {
        "host": os.environ.get("KITCHEN_MCP_HOST", "127.0.0.1"),
        "port": _env_int("KITCHEN_MCP_PORT", 8765),
        "streamable_http_path": os.environ.get("KITCHEN_MCP_STREAMABLE_HTTP_PATH", "/mcp"),
        "sse_path": os.environ.get("KITCHEN_MCP_SSE_PATH", "/sse"),
        "message_path": os.environ.get("KITCHEN_MCP_MESSAGE_PATH", "/messages/"),
        "stateless_http": _env_bool("KITCHEN_MCP_STATELESS_HTTP", False),
    }


def _auth_provider():
    token = os.environ.get("KITCHEN_MCP_BEARER_TOKEN", "").strip()
    if not token:
        return None
    if DebugTokenVerifier is None:
        raise RuntimeError("KITCHEN_MCP_BEARER_TOKEN requires FastMCP auth support")
    return DebugTokenVerifier(
        validate=lambda candidate: secrets.compare_digest(candidate, token),
        client_id="agentkitchen-mcp-client",
    )


def _build_mcp() -> FastMCP:
    options = _server_options()
    try:
        return FastMCP("knowledge-system", auth=_auth_provider(), **options)
    except TypeError:  # pragma: no cover - older FastMCP compatibility
        return FastMCP("knowledge-system")


mcp = _build_mcp()


def _mcp_tool(fn):
    mcp.tool()(fn)
    return fn


def _root() -> Path:
    return Path(os.environ.get("KNOWLEDGE_ROOT", ".")).expanduser().resolve()


def _recipes_catalog_path() -> Path:
    return _root() / "docs" / "OPEN_BRAIN_RECIPES_CATALOG.md"


def _recipes_catalog_text() -> str:
    path = _recipes_catalog_path()
    if path.exists():
        return path.read_text(errors="replace")
    return "# Open Brain Recipe Catalog\n\nNo recipe catalog found at docs/OPEN_BRAIN_RECIPES_CATALOG.md.\n"


def _mem0_url() -> str:
    return os.environ.get("MEM0_URL", "http://localhost:3201").rstrip("/")


def _public_base_url() -> str:
    return os.environ.get("KITCHEN_MCP_PUBLIC_BASE_URL", "https://agentkitchen.local").rstrip("/")


def _split_chatgpt_id(document_id: str) -> tuple[str, Optional[int]]:
    path, _, line_fragment = document_id.partition("#L")
    line = int(line_fragment) if line_fragment.isdigit() else None
    return path, line


def _chatgpt_document_id(path: str, line: Optional[int] = None) -> str:
    return f"{path}#L{line}" if line else path


def _chatgpt_url(path: str, line: Optional[int] = None) -> str:
    encoded_path = "/".join(quote(part) for part in path.split("/"))
    suffix = f"#L{line}" if line else ""
    return f"{_public_base_url()}/knowledge/{encoded_path}{suffix}"


def _chatgpt_title(path: str, text: str = "") -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip() or Path(path).stem
    return Path(path).stem.replace("-", " ").replace("_", " ").title()


# ---------------------------------------------------------------------------
# Core lightweight surface
# ---------------------------------------------------------------------------


@_mcp_tool
def knowledge_health() -> dict:
    """Return configured knowledge status without exposing secrets."""
    root = _root()
    store = KnowledgeStore(root)
    manifest = store.manifest() if root.exists() else {"known_files": [], "file_count": 0}
    mem0_status = "not_checked"
    if httpx is not None:
        try:
            response = httpx.get(f"{_mem0_url()}/health", timeout=2)
            mem0_status = "ok" if response.status_code == 200 else f"http_{response.status_code}"
        except Exception:
            mem0_status = "unavailable"
    return {
        "status": "ok" if root.exists() else "missing_root",
        "root": str(root),
        "file_count": manifest.get("file_count", 0),
        "wiki_present": manifest.get("wiki_present", False),
        "mem0": mem0_status,
        "capability_model": "core-plus-workspaces",
    }


@_mcp_tool
def knowledge_manifest() -> dict:
    """List known markdown files and whether a generated wiki is present."""
    return KnowledgeStore(_root()).manifest()


@_mcp_tool
def knowledge_search(query: str, limit: int = 20) -> list[dict]:
    """Search source and generated wiki markdown for a literal query."""
    return KnowledgeStore(_root()).search(query=query, limit=limit)


@_mcp_tool
def knowledge_read(path: str, max_chars: int = 20000) -> dict:
    """Read a knowledge file by repo-relative path with traversal protection."""
    return KnowledgeStore(_root()).read_text(path, max_chars=max_chars)


@_mcp_tool
def search(query: str) -> dict:
    """Use this for ChatGPT connector search. Returns matching MemroOS knowledge documents."""
    store = KnowledgeStore(_root())
    results = []
    for item in store.search(query=query, limit=10):
        path = str(item["path"])
        line = int(item.get("line") or 0) or None
        try:
            document = store.read_text(path, max_chars=4000)
            title = _chatgpt_title(path, document.get("content", ""))
        except Exception:
            title = _chatgpt_title(path, str(item.get("preview", "")))
        results.append({
            "id": _chatgpt_document_id(path, line),
            "title": title,
            "url": _chatgpt_url(path, line),
        })
    return {"results": results}


@_mcp_tool
def fetch(id: str) -> dict:
    """Use this for ChatGPT connector fetch. Returns a full MemroOS knowledge document by search result id."""
    path, line = _split_chatgpt_id(id)
    document = KnowledgeStore(_root()).read_text(path, max_chars=50000)
    text = str(document.get("content", ""))
    return {
        "id": _chatgpt_document_id(path, line),
        "title": _chatgpt_title(path, text),
        "text": text,
        "url": _chatgpt_url(path, line),
        "metadata": {
            "path": path,
            "source": "agentkitchen",
            "truncated": bool(document.get("truncated", False)),
        },
    }


@_mcp_tool
def memory_search(query: str, agent_id: str = "", limit: int = 5) -> dict:
    """Search durable agent memory through the configured memory adapter."""
    if httpx is None:
        return {"status": "unavailable", "error": "httpx is not installed", "results": []}
    try:
        params: dict = {"q": query, "limit": limit}
        if agent_id:
            params["agent_id"] = agent_id
        response = httpx.get(f"{_mem0_url()}/memory/search", params=params, timeout=10)
        response.raise_for_status()
        results = response.json().get("results", [])
        enriched = []
        for item in results:
            if isinstance(item, dict):
                result = dict(item)
                result.setdefault("metadata", extract_metadata(item))
                result["provenance"] = provenance_label(item)
                enriched.append(result)
            else:
                enriched.append({"memory": str(item), "metadata": {}, "provenance": "source: unknown"})
        return {"status": "ok", "results": enriched}
    except Exception as exc:
        return {"status": "unavailable", "error": str(exc), "results": []}


@_mcp_tool
def memory_save(text: str, agent_id: str = "shared", metadata: Optional[dict] = None) -> dict:
    """Save a durable memory through the configured memory adapter."""
    if httpx is None:
        return {"status": "unavailable", "error": "httpx is not installed"}
    try:
        response = httpx.post(
            f"{_mem0_url()}/memory/add",
            json={
                "text": text,
                "agent_id": agent_id,
                "metadata": normalize_metadata(
                    metadata,
                    agent_id=agent_id,
                    default_source="knowledge-mcp",
                ),
            },
            timeout=10,
        )
        response.raise_for_status()
        return {"status": "ok", "response": response.json()}
    except Exception as exc:
        return {"status": "unavailable", "error": str(exc)}


# ---------------------------------------------------------------------------
# Progressive tool gateway
# ---------------------------------------------------------------------------


@_mcp_tool
def tool_catalog() -> dict:
    """Return the progressive tool/capability catalog."""
    return tool_attention.build_catalog()


@_mcp_tool
def tool_discover(query: str = "", limit: int = 25) -> dict:
    """Find relevant MCP servers, workspaces, skills, and references for a task."""
    return tool_attention.discover(query=query, limit=limit)


@_mcp_tool
def tool_load(capability_id: str) -> dict:
    """Load instructions for one discovered capability by id."""
    return tool_attention.load_capability(capability_id)


@_mcp_tool
def tool_record_outcome(
    tool_id: str,
    task: str,
    outcome: str,
    metadata: Optional[dict] = None,
) -> dict:
    """Record whether a selected tool helped so future discovery can improve."""
    return tool_attention.record_outcome(
        tool_id=tool_id,
        task=task,
        outcome=outcome,
        metadata=metadata,
    )


@_mcp_tool
def tool_stats() -> dict:
    """Return compact progressive tool gateway health and usage stats."""
    return tool_attention.stats()


# ---------------------------------------------------------------------------
# Progressive disclosure meta-tools
# ---------------------------------------------------------------------------


@_mcp_tool
def knowledge_capabilities(workspace: Optional[str] = None) -> dict:
    """Show core capabilities or a deeper workspace manifest."""
    return get_capabilities(workspace)


@_mcp_tool
def knowledge_open_workspace(workspace: str) -> dict:
    """Open a deeper capability workspace for the current task."""
    return open_workspace(workspace)


@_mcp_tool
def knowledge_workspace_call(workspace: str, action: str, arguments: Optional[dict] = None) -> dict:
    """Execute a deep workspace action without exposing every action as a top-level tool."""
    args = arguments or {}
    if workspace == "wiki" and action == "compile":
        source_glob = args.get("source_glob")
        wiki_subdir = args.get("wiki_subdir", "wiki")
        globs = [source_glob] if source_glob else None
        return compile_wiki(root=_root(), source_globs=globs, wiki_subdir=wiki_subdir)
    if workspace == "wiki" and action == "index":
        return {"status": "ok", "content": wiki_index_resource()}
    if workspace == "agent-memory" and action == "health":
        return {"status": "ok", "health": knowledge_health().get("mem0")}
    if workspace == "graph" and action in {"read", "stats"}:
        root = _root()
        graph_path = root / "wiki" / "graph" / "knowledge-graph.json"
        if not graph_path.exists():
            graph_path = root / "llm-wiki" / "wiki" / "graph" / "knowledge-graph.json"
        if not graph_path.exists():
            return {"status": "missing_graph", "error": "Run wiki compile first."}
        graph = graph_path.read_text(errors="replace")
        if action == "read":
            return {"status": "ok", "path": str(graph_path), "content": graph}
        import json
        parsed = json.loads(graph)
        return {"status": "ok", "nodes": len(parsed.get("nodes", [])), "edges": len(parsed.get("edges", []))}
    if workspace == "dashboard" and action == "manifest":
        root = _root()
        manifest_path = root / "wiki" / "dashboard" / "manifest.json"
        if not manifest_path.exists():
            manifest_path = root / "llm-wiki" / "wiki" / "dashboard" / "manifest.json"
        if not manifest_path.exists():
            return {"status": "missing_manifest", "error": "Run wiki compile first."}
        import json
        return {"status": "ok", "manifest": json.loads(manifest_path.read_text(errors="replace"))}
    if workspace == "tool-attention":
        if action == "catalog":
            return tool_attention.build_catalog()
        if action == "discover":
            return tool_attention.discover(
                query=str(args.get("query", "")),
                limit=int(args.get("limit", 25)),
            )
        if action == "load":
            return tool_attention.load_capability(str(args.get("id", args.get("capability_id", ""))))
        if action == "record_outcome":
            return tool_attention.record_outcome(
                tool_id=str(args.get("tool_id", args.get("toolId", ""))),
                task=str(args.get("task", "")),
                outcome=str(args.get("outcome", "")),
                metadata=args.get("metadata") if isinstance(args.get("metadata"), dict) else None,
            )
        if action == "stats":
            return tool_attention.stats()
        return {
            "status": "unsupported_action",
            "workspace": workspace,
            "action": action,
            "capabilities": get_capabilities(workspace),
        }
    if workspace in {"ingestion", "workflows", "skill-packs", "integrations", "primitives"}:
        if action in {"catalog", "read", "list"}:
            return {
                "status": "ok",
                "workspace": workspace,
                "path": str(_recipes_catalog_path()),
                "content": _recipes_catalog_text(),
            }
        return {
            "status": "not_implemented",
            "workspace": workspace,
            "action": action,
            "message": "This workspace is cataloged, but the runtime adapter is not implemented yet.",
            "catalog": str(_recipes_catalog_path()),
        }
    return {
        "status": "unsupported_action",
        "workspace": workspace,
        "action": action,
        "capabilities": get_capabilities(workspace),
    }


# ---------------------------------------------------------------------------
# Resources and prompts
# ---------------------------------------------------------------------------


@mcp.resource("knowledge://manifest")
def manifest_resource() -> dict:
    """Machine-readable manifest for agent clients."""
    return KnowledgeStore(_root()).manifest()


@mcp.resource("knowledge://wiki/index")
def wiki_index_resource() -> str:
    """Generated wiki index markdown."""
    root = _root()
    for candidate in (root / "wiki" / "index.md", root / "llm-wiki" / "wiki" / "index.md"):
        if candidate.exists():
            return candidate.read_text(errors="replace")
    return "# Wiki Index\n\nNo generated wiki index found. Open the wiki workspace and run action `compile`.\n"


@mcp.resource("knowledge://recipes/catalog")
def recipes_catalog_resource() -> str:
    """Open Brain / OB1 recipe catalog and implementation backlog."""
    return _recipes_catalog_text()


@mcp.prompt()
def knowledge_system_orientation() -> str:
    """Prompt that tells an agent how to use the knowledge system safely."""
    return (
        "Use the agentkitchen MCP server as one progressive facade with progressive disclosure. "
        "Start with core tools: health, manifest, search, read, memory_search, memory_save. "
        "If a task needs deeper capability, call knowledge_capabilities or knowledge_open_workspace. "
        "Use knowledge_workspace_call for deep actions like wiki compile. "
        "Available workspaces: wiki, vector, agent-memory, admin, graph, dashboard, ingestion, workflows, skill-packs, integrations, primitives, tool-attention. "
        "Treat source files as authoritative and generated wiki pages as compiled views with citations."
    )


def run_server() -> None:
    """Run the MCP server using env-selected stdio, SSE, or Streamable HTTP transport."""
    try:
        mcp.run(transport=_server_transport())
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    run_server()
