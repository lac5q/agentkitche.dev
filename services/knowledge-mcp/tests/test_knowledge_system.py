#!/usr/bin/env python3
"""Behavior tests for the public-safe hybrid knowledge system."""

import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from knowledge_system.capabilities import CORE_TOOLS, get_capabilities, open_workspace
from knowledge_system.compiler import compile_wiki, discover_sources, slugify
from knowledge_system.store import KnowledgeStore
from knowledge_system import mcp_server, tool_attention


def test_slugify_is_public_safe_and_stable():
    assert slugify("Client X: Q2 Strategy / Timeline") == "client-x-q2-strategy-timeline"


def test_discover_sources_ignores_generated_and_hidden_dirs():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "sources").mkdir()
        (root / "sources" / "meeting.md").write_text("# Meeting\nTimeline is 8 weeks.")
        (root / "wiki").mkdir()
        (root / "wiki" / "generated.md").write_text("# Generated")
        (root / "llm-wiki" / "wiki").mkdir(parents=True)
        (root / "llm-wiki" / "wiki" / "generated.md").write_text("# Generated")
        (root / "llm-wiki" / "raw").mkdir(parents=True)
        (root / "llm-wiki" / "raw" / "raw-note.md").write_text("# Raw Note\nKeep this source.")
        (root / ".git").mkdir()
        (root / ".git" / "secret.md").write_text("do not read")

        resolved_root = root.resolve()
        found = [p.relative_to(resolved_root).as_posix() for p in discover_sources(root, ["sources/*.md", "llm-wiki/**/*.md"])]

        assert found == ["llm-wiki/raw/raw-note.md", "sources/meeting.md"]


def test_compile_wiki_builds_sourced_index_log_and_topic_page():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_dir = root / "sources"
        source_dir.mkdir()
        (source_dir / "meeting.md").write_text(
            "# Client Timeline Meeting\n\n"
            "Engineering said delivery is 12 weeks. Sales promised 8 weeks.\n"
            "The team discussed Mem0, Qdrant, OpenBrain, and Karpathy wiki architecture.\n"
            "Decision: keep source data authoritative and use the wiki as a compiled view.\n"
            "Action item: reconcile timeline before proposal.\n"
        )

        result = compile_wiki(root=root, source_globs=["sources/*.md"])

        assert result["sources_processed"] == 1
        assert result["pages_written"] >= 1
        index = (root / "wiki" / "index.md").read_text()
        log = (root / "wiki" / "log.md").read_text()
        topic_pages = list((root / "wiki" / "topics").glob("*.md"))
        source_pages = list((root / "wiki" / "sources").glob("*.md"))
        decision_pages = list((root / "wiki" / "decisions").glob("*.md"))

        assert "client-timeline-meeting" in index
        assert "compile" in log
        assert topic_pages, "expected at least one topic page"
        assert source_pages, "expected at least one source page"
        assert decision_pages, "expected at least one decision/action page"
        assert (root / "wiki" / "topic-map.md").exists()
        assert (root / "wiki" / "concepts" / "agent-memory-architecture.md").exists()
        assert (root / "wiki" / "entities" / "mem0.md").exists()
        graph = json.loads((root / "wiki" / "graph" / "knowledge-graph.json").read_text())
        assert any(edge["relation"] == "derived_from" for edge in graph["edges"])
        assert any(edge["relation"] == "mentions_entity" for edge in graph["edges"])
        assert (root / "wiki" / "dashboard" / "manifest.json").exists()
        page = topic_pages[0].read_text()
        assert "sources/meeting.md" in page
        assert "Contradictions / Tensions" in page
        assert "12 weeks" in page
        assert "8 weeks" in page


def test_knowledge_store_search_reads_source_and_wiki_files():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "sources").mkdir()
        (root / "sources" / "note.md").write_text("Important agent memory architecture note")
        (root / "wiki" / "topics").mkdir(parents=True)
        (root / "wiki" / "topics" / "memory.md").write_text("Compiled memory architecture")

        store = KnowledgeStore(root)
        results = store.search("architecture", limit=10)

        paths = {r["path"] for r in results}
        assert "sources/note.md" in paths
        assert "wiki/topics/memory.md" in paths


def test_knowledge_store_manifest_is_json_safe():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "wiki").mkdir()
        (root / "wiki" / "index.md").write_text("# Index")

        manifest = KnowledgeStore(root).manifest()
        json.dumps(manifest)

        assert manifest["root"] == str(root.resolve())
        assert "wiki/index.md" in manifest["known_files"]


def test_chatgpt_search_returns_connector_result_shape(monkeypatch):
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "sources").mkdir()
        (root / "sources" / "note.md").write_text("# Agent Memory\n\nImportant agent memory architecture note")
        monkeypatch.setenv("KNOWLEDGE_ROOT", str(root))
        monkeypatch.setenv("MEMROOS_MCP_PUBLIC_BASE_URL", "https://memroos.example.test")

        payload = mcp_server.search("architecture")

        assert list(payload) == ["results"]
        assert payload["results"] == [
            {
                "id": "sources/note.md#L3",
                "title": "Agent Memory",
                "url": "https://memroos.example.test/knowledge/sources/note.md#L3",
            }
        ]


def test_chatgpt_fetch_returns_connector_document_shape(monkeypatch):
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "sources").mkdir()
        (root / "sources" / "note.md").write_text("# Agent Memory\n\nImportant agent memory architecture note")
        monkeypatch.setenv("KNOWLEDGE_ROOT", str(root))
        monkeypatch.setenv("MEMROOS_MCP_PUBLIC_BASE_URL", "https://memroos.example.test")

        payload = mcp_server.fetch("sources/note.md#L3")

        assert payload == {
            "id": "sources/note.md#L3",
            "title": "Agent Memory",
            "text": "# Agent Memory\n\nImportant agent memory architecture note",
            "url": "https://memroos.example.test/knowledge/sources/note.md#L3",
            "metadata": {
                "path": "sources/note.md",
                "source": "memroos",
                "truncated": False,
            },
        }


def test_core_tools_stay_small_for_progressive_disclosure():
    assert CORE_TOOLS == [
        "knowledge_health",
        "knowledge_manifest",
        "knowledge_search",
        "knowledge_read",
        "memory_search",
        "memory_save",
    ]


def test_mcp_transport_env_supports_stdio_and_remote_http(monkeypatch):
    monkeypatch.delenv("MEMROOS_MCP_TRANSPORT", raising=False)
    assert mcp_server._server_transport() == "stdio"

    monkeypatch.setenv("MEMROOS_MCP_TRANSPORT", "http")
    assert mcp_server._server_transport() == "streamable-http"

    monkeypatch.setenv("MEMROOS_MCP_TRANSPORT", "streamable_http")
    assert mcp_server._server_transport() == "streamable-http"

    monkeypatch.setenv("MEMROOS_MCP_TRANSPORT", "sse")
    assert mcp_server._server_transport() == "sse"


def test_mcp_server_options_are_env_configurable(monkeypatch):
    monkeypatch.setenv("MEMROOS_MCP_HOST", "0.0.0.0")
    monkeypatch.setenv("MEMROOS_MCP_PORT", "8765")
    monkeypatch.setenv("MEMROOS_MCP_STREAMABLE_HTTP_PATH", "/mcp")
    monkeypatch.setenv("MEMROOS_MCP_STATELESS_HTTP", "true")

    assert mcp_server._server_options() == {
        "host": "0.0.0.0",
        "port": 8765,
        "streamable_http_path": "/mcp",
        "sse_path": "/sse",
        "message_path": "/messages/",
        "stateless_http": True,
    }


def test_mcp_auth_provider_is_disabled_without_token(monkeypatch):
    monkeypatch.delenv("MEMROOS_MCP_BEARER_TOKEN", raising=False)
    assert mcp_server._auth_provider() is None


def test_mcp_auth_provider_accepts_only_configured_bearer_token(monkeypatch):
    monkeypatch.setenv("MEMROOS_MCP_BEARER_TOKEN", "secret-token")
    if mcp_server.DebugTokenVerifier is None:
        with pytest.raises(RuntimeError, match="requires FastMCP auth support"):
            mcp_server._auth_provider()
        return

    provider = mcp_server._auth_provider()

    assert provider is not None
    assert provider.validate("secret-token")
    assert not provider.validate("wrong-token")


def test_capability_registry_hides_deep_tools_until_requested():
    core = get_capabilities()
    assert core["mode"] == "core"
    assert "wiki_compile" not in core["tools"]
    assert "vector_search" not in core["tools"]

    wiki = get_capabilities("wiki")
    assert wiki["mode"] == "workspace"
    assert "wiki_compile" in wiki["tools"]
    assert "wiki_lint" in wiki["tools"]

    ingestion = get_capabilities("ingestion")
    assert ingestion["mode"] == "workspace"
    assert "recipe_catalog" in ingestion["tools"]
    assert "knowledge://recipes/catalog" in ingestion["resources"]

    tool_workspace = get_capabilities("tool-attention")
    assert tool_workspace["mode"] == "workspace"
    assert "tool_discover" in tool_workspace["tools"]


def test_open_brain_catalog_doc_tracks_imports_workflows_skills_and_integrations():
    catalog = (Path(__file__).resolve().parents[1] / "docs" / "OPEN_BRAIN_RECIPES_CATALOG.md").read_text()
    assert "ChatGPT Import" in catalog
    assert "Obsidian Vault Import" in catalog
    assert "Auto-Capture Protocol" in catalog
    assert "World Model Readiness Diagnostic" in catalog
    assert "Discord Capture" in catalog
    assert "Content Fingerprint Dedup" in catalog


def test_open_workspace_returns_instructions_and_no_secret_config():
    opened = open_workspace("admin")
    json.dumps(opened)

    assert opened["workspace"] == "admin"
    assert "admin" in opened["description"].lower()
    assert "tools" in opened
    assert "api_key" not in json.dumps(opened).lower()


def test_tool_attention_catalog_discovers_and_records_outcomes(monkeypatch):
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "logs").mkdir()
        (root / ".mcp.json").write_text(json.dumps({"mcpServers": {"gitnexus": {"command": "gitnexus"}}}))
        catalog_path = root / "tool-catalog.json"
        catalog_path.write_text(
            json.dumps(
                {
                    "sources": [{"id": "example", "label": "Example", "type": "test", "status": "available"}],
                    "capabilities": [
                        {
                            "id": "external:router",
                            "name": "Router",
                            "type": "framework-pattern",
                            "source": "example",
                            "description": "Routes tool choices",
                            "status": "candidate",
                            "tags": ["router"],
                            "useWhen": ["Need routing"],
                            "topLevel": False,
                            "loadCommand": "test",
                        }
                    ],
                }
            )
        )
        monkeypatch.setenv("MEMROOS_ROOT", str(root))
        monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(catalog_path))
        monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(root / "logs" / "outcomes.jsonl"))
        monkeypatch.setenv("SKILLS_PATH", str(root / "missing-skills"))

        catalog = tool_attention.build_catalog()
        ids = {item["id"] for item in catalog["capabilities"]}
        assert "mcp-server:gitnexus" in ids
        assert "knowledge-workspace:tool-attention" in ids
        assert "external:router" in ids
        catalog_payload = json.dumps(catalog)
        assert str(root) not in catalog_payload
        assert "catalogPath" not in catalog["health"]
        assert "outcomesPath" not in catalog["health"]
        assert catalog["health"]["catalog"] == "available"
        assert catalog["sources"][0]["path"] == ".mcp.json"

        discovered = tool_attention.discover("router", limit=5)
        assert discovered["capabilities"][0]["id"] == "external:router"
        assert str(root) not in json.dumps(discovered)

        result = tool_attention.record_outcome("external:router", "test task", "helped")
        assert result["status"] == "ok"
        assert str(root) not in json.dumps(result)
        stats = tool_attention.stats()
        assert stats["summary"]["recentOutcomes"] == 1
        assert stats["outcomesByTool"]["external:router"]["successes"] == 1
        assert "test task" not in json.dumps(stats)

        rediscovered = tool_attention.discover("router", limit=5)
        assert rediscovered["capabilities"][0]["outcomeSummary"]["score"] == 2


def test_tool_attention_top_level_mcp_tools(monkeypatch):
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "logs").mkdir()
        (root / ".mcp.json").write_text(json.dumps({"mcpServers": {"gitnexus": {"command": "gitnexus"}}}))
        monkeypatch.setenv("MEMROOS_ROOT", str(root))
        monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(root / "missing-catalog.json"))
        monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(root / "logs" / "outcomes.jsonl"))
        monkeypatch.setenv("SKILLS_PATH", str(root / "missing-skills"))

        catalog = mcp_server.tool_catalog()
        assert catalog["status"] == "ok"
        assert "mcp-server:gitnexus" in {item["id"] for item in catalog["capabilities"]}

        discovered = mcp_server.tool_discover("gitnexus", limit=3)
        assert discovered["capabilities"][0]["id"] == "mcp-server:gitnexus"

        loaded = mcp_server.tool_load("mcp-server:gitnexus")
        assert loaded["status"] == "ok"
        assert loaded["capability"]["name"] == "gitnexus"

        recorded = mcp_server.tool_record_outcome("mcp-server:gitnexus", "code graph task", "helped")
        assert recorded["status"] == "ok"
        stats = mcp_server.tool_stats()
        assert stats["summary"]["recentOutcomes"] == 1
        assert stats["outcomesByTool"]["mcp-server:gitnexus"]["score"] == 2
        assert str(root) not in json.dumps(recorded)


def test_tool_attention_optional_agent_lightning(monkeypatch):
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "logs").mkdir()
        (root / ".mcp.json").write_text(json.dumps({"mcpServers": {"gitnexus": {"command": "gitnexus"}}}))
        monkeypatch.setenv("MEMROOS_ROOT", str(root))
        monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(root / "missing-catalog.json"))
        monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(root / "logs" / "outcomes.jsonl"))
        monkeypatch.setenv("SKILLS_PATH", str(root / "missing-skills"))
        monkeypatch.setenv("MEMROOS_OPTIONAL_CAPABILITIES", "gitnexus,agent-lightning")

        discovered = mcp_server.tool_discover("agent lightning APO skill proposals", limit=5)
        assert "capability:agent-lightning" in {item["id"] for item in discovered["capabilities"]}
        agent_lightning = next(item for item in discovered["capabilities"] if item["id"] == "capability:agent-lightning")
        assert agent_lightning["status"] in {"available", "degraded", "missing"}

        catalog = mcp_server.tool_catalog()
        gitnexus = next(item for item in catalog["capabilities"] if item["id"] == "mcp-server:gitnexus")
        assert gitnexus["status"] in {"available", "degraded", "missing"}


# ---------------------------------------------------------------------------
# OPSGW-03: Dedicated coverage for each top-level Knowledge MCP gateway tool
# ---------------------------------------------------------------------------

def _setup_minimal_root(tmp: Path, monkeypatch) -> Path:
    """Write a minimal env so tool_attention functions work in isolation."""
    (tmp / ".mcp.json").write_text(json.dumps({"mcpServers": {"test-server": {"command": "test"}}}))
    monkeypatch.setenv("MEMROOS_ROOT", str(tmp))
    monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(tmp / "missing-catalog.json"))
    monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(tmp / "outcomes.jsonl"))
    monkeypatch.setenv("SKILLS_PATH", str(tmp / "missing-skills"))
    return tmp


def test_tool_catalog_returns_capabilities_and_sources(monkeypatch):
    """tool_catalog exposes all capabilities and sources without raw task text."""
    with TemporaryDirectory() as tmp:
        root = _setup_minimal_root(Path(tmp), monkeypatch)
        catalog = tool_attention.build_catalog()
        assert "capabilities" in catalog
        assert "sources" in catalog
        assert "summary" in catalog
        assert "status" in catalog
        # Privacy: no raw task text visible — task field only appears in recentOutcomes by design
        payload = json.dumps(catalog)
        assert str(root) not in payload


def test_tool_discover_returns_ranked_results(monkeypatch):
    """tool_discover returns capabilities sorted by score, limited to requested count."""
    with TemporaryDirectory() as tmp:
        _setup_minimal_root(Path(tmp), monkeypatch)
        result = tool_attention.discover(query="knowledge", limit=5)
        assert result["status"] == "ok"
        assert isinstance(result["capabilities"], list)
        assert len(result["capabilities"]) <= 5
        # All returned capabilities match the query
        for cap in result["capabilities"]:
            haystack = " ".join([
                cap.get("id", ""), cap.get("name", ""), cap.get("description", ""),
                cap.get("source", ""), " ".join(cap.get("tags", [])),
            ]).lower()
            assert "knowledge" in haystack


def test_tool_load_returns_capability_by_id(monkeypatch):
    """tool_load returns a single capability by ID with instructions."""
    with TemporaryDirectory() as tmp:
        _setup_minimal_root(Path(tmp), monkeypatch)
        result = tool_attention.load_capability("knowledge-workspace:tool-attention")
        assert result["status"] == "ok"
        assert result["capability"]["id"] == "knowledge-workspace:tool-attention"
        assert "instructions" in result
        not_found = tool_attention.load_capability("nonexistent:capability")
        assert not_found["status"] == "not_found"


def test_tool_record_outcome_writes_jsonl(monkeypatch, tmp_path):
    """tool_record_outcome appends a well-formed record to the outcomes log."""
    outcomes_path = tmp_path / "outcomes.jsonl"
    monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(outcomes_path))
    monkeypatch.setenv("MEMROOS_ROOT", str(tmp_path))
    monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(tmp_path / "missing-catalog.json"))
    monkeypatch.setenv("SKILLS_PATH", str(tmp_path / "missing-skills"))

    result = tool_attention.record_outcome(
        tool_id="skill:test-tool",
        task="implement feature X",
        outcome="helped",
        metadata={"task_type": "coding", "repo": "my-repo"},
    )
    assert result["status"] == "ok"
    assert outcomes_path.exists()
    lines = [json.loads(line) for line in outcomes_path.read_text().splitlines() if line.strip()]
    assert len(lines) == 1
    rec = lines[0]
    assert rec["toolId"] == "skill:test-tool"
    assert rec["outcome"] == "helped"
    assert rec["metadata"]["task_type"] == "coding"
    assert "timestamp" in rec
    # task is stored in JSONL (intentional — stats layer never exposes it)
    assert "task" in rec


def test_tool_stats_omits_raw_task_text(monkeypatch, tmp_path):
    """tool_stats aggregate output never exposes raw task text."""
    outcomes_path = tmp_path / "outcomes.jsonl"
    outcomes_path.write_text(
        json.dumps({
            "timestamp": "2026-05-04T00:00:00Z",
            "toolId": "skill:sensitive",
            "task": "top secret task description that must not leak",
            "outcome": "helped",
            "metadata": {"task_type": "review"},
        }) + "\n"
    )
    monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(outcomes_path))
    monkeypatch.setenv("MEMROOS_ROOT", str(tmp_path))
    monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(tmp_path / "missing-catalog.json"))
    monkeypatch.setenv("SKILLS_PATH", str(tmp_path / "missing-skills"))

    result = tool_attention.stats()
    payload = json.dumps(result)
    assert "top secret task description" not in payload
    assert result["status"] == "ok"
    assert "outcomesByTool" in result
    assert "skill:sensitive" in result["outcomesByTool"]
    assert result["outcomesByTool"]["skill:sensitive"]["successes"] == 1


# ---------------------------------------------------------------------------
# TOOLGW-03: category field distinguishes capability types in tool_discover
# ---------------------------------------------------------------------------

def test_tool_discover_categories_distinguish_types(monkeypatch, tmp_path):
    """tool_discover includes a categories summary distinguishing MCP servers, workspaces, skills."""
    # Set up a root with at least an MCP server and a skills dir
    (tmp_path / ".mcp.json").write_text(json.dumps({"mcpServers": {"my-server": {"command": "cmd"}}}))
    skills_dir = tmp_path / "skills" / "my-skill"
    skills_dir.mkdir(parents=True)
    (skills_dir / "SKILL.md").write_text("# my-skill\ndescription: A test skill\n")

    monkeypatch.setenv("MEMROOS_ROOT", str(tmp_path))
    monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(tmp_path / "missing-catalog.json"))
    monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(tmp_path / "outcomes.jsonl"))
    monkeypatch.setenv("SKILLS_PATH", str(tmp_path / "skills"))

    result = tool_attention.discover()
    assert "categories" in result, "discover() must include a 'categories' summary"
    cats = result["categories"]
    assert isinstance(cats, dict)
    assert "mcp-server" in cats, f"Expected mcp-server category, got: {cats}"
    assert "workspace" in cats, f"Expected workspace category, got: {cats}"
    assert "skill" in cats, f"Expected skill category, got: {cats}"
    # Each returned capability must have a non-empty category field
    for cap in result["capabilities"]:
        assert cap.get("category"), f"Capability {cap.get('id')} missing category field"


def test_capability_category_field_set_on_all_types(monkeypatch, tmp_path):
    """Every capability returned by build_catalog has a category field."""
    (tmp_path / ".mcp.json").write_text(json.dumps({"mcpServers": {"srv": {}}}))
    monkeypatch.setenv("MEMROOS_ROOT", str(tmp_path))
    monkeypatch.setenv("TOOL_ATTENTION_CATALOG", str(tmp_path / "missing-catalog.json"))
    monkeypatch.setenv("TOOL_ATTENTION_OUTCOMES", str(tmp_path / "outcomes.jsonl"))
    monkeypatch.setenv("SKILLS_PATH", str(tmp_path / "missing-skills"))

    catalog = tool_attention.build_catalog()
    for cap in catalog["capabilities"]:
        assert cap.get("category"), f"Capability {cap.get('id')} has no category"
