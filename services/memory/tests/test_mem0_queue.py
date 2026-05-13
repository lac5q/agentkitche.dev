import importlib.util
import sqlite3
import sys
import types
from pathlib import Path

import httpx
import pytest


MEMORY_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MEMORY_DIR))

import mem0_queue
from provenance import format_memory_result, normalize_metadata, provenance_label


def queued_count(db_path: Path) -> int:
    with sqlite3.connect(db_path) as conn:
        return conn.execute("SELECT COUNT(*) FROM queued_requests").fetchone()[0]


def load_mem0_server(monkeypatch, module_name: str):
    fastapi = types.ModuleType("fastapi")

    class FastAPI:
        def __init__(self, *args, **kwargs):
            self.router = types.SimpleNamespace(lifespan_context=None)

        def exception_handler(self, *args, **kwargs):
            return lambda func: func

        def post(self, *args, **kwargs):
            return lambda func: func

        def get(self, *args, **kwargs):
            return lambda func: func

        def delete(self, *args, **kwargs):
            return lambda func: func

    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    def Query(default, **kwargs):
        return default

    fastapi.FastAPI = FastAPI
    fastapi.HTTPException = HTTPException
    fastapi.Query = Query
    fastapi.Request = object

    responses = types.ModuleType("fastapi.responses")

    class JSONResponse:
        def __init__(self, status_code: int, content: dict):
            self.status_code = status_code
            self.content = content

    responses.JSONResponse = JSONResponse

    monkeypatch.setitem(sys.modules, "fastapi", fastapi)
    monkeypatch.setitem(sys.modules, "fastapi.responses", responses)

    module_path = MEMORY_DIR / "mem0-server.py"
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_retryable_response_detects_provider_and_backend_failures():
    assert mem0_queue.is_retryable_response(httpx.Response(429, text="quota exceeded"))
    assert mem0_queue.is_retryable_response(httpx.Response(503, text="service unavailable"))
    assert mem0_queue.is_retryable_response(
        httpx.Response(403, text="SERVICE_DISABLED for project 498437118126")
    )

    assert not mem0_queue.is_retryable_response(httpx.Response(400, text="bad request"))
    assert not mem0_queue.is_retryable_response(httpx.Response(403, text="forbidden"))


def test_provenance_metadata_defaults_and_preserves_source_fields():
    metadata = normalize_metadata(
        {
            "source_type": "email",
            "source_title": "Juan: Getting started with 1-1s",
            "source_path": "knowledge/emails/2026-05-11-juan.md",
        },
        agent_id="shared",
        default_source="mcp-mem0",
    )

    assert metadata["source"] == "mcp-mem0"
    assert metadata["source_type"] == "email"
    assert metadata["source_title"] == "Juan: Getting started with 1-1s"
    assert metadata["source_path"] == "knowledge/emails/2026-05-11-juan.md"
    assert metadata["saved_by_agent"] == "shared"
    assert metadata["ingested_at"].endswith("Z")


def test_memory_format_includes_provenance_for_consuming_agents():
    memory = {
        "memory": "Juan asked for 1:1s with Eric, Lior, and Sagi.",
        "score": 0.87,
        "metadata": {
            "source": "gmail",
            "source_type": "email",
            "source_title": "Getting started with 1-1s",
            "source_url": "https://mail.google.com/mail/u/0/#inbox/abc",
            "captured_at": "2026-05-11T21:25:00-04:00",
            "saved_by_agent": "shared",
        },
    }

    assert provenance_label(memory).startswith("source: email/gmail")
    formatted = format_memory_result(1, memory)
    assert "Juan asked for 1:1s" in formatted
    assert "relevance: 0.87" in formatted
    assert "title: Getting started with 1-1s" in formatted
    assert "url: https://mail.google.com/mail/u/0/#inbox/abc" in formatted


def test_queue_request_preserves_retryable_http_failures(monkeypatch, tmp_path):
    db_path = tmp_path / "queue.db"
    queue = mem0_queue.Mem0Queue(db_path=str(db_path), start_replay=False)
    payload = {"text": "Cordant email context", "agent_id": "shared"}

    monkeypatch.setattr(
        mem0_queue.httpx,
        "post",
        lambda *args, **kwargs: httpx.Response(429, text="RESOURCE_EXHAUSTED quota"),
    )

    assert queue.queue_request("/memory/add", "POST", payload) is True
    assert queued_count(db_path) == 1


def test_queue_dedupes_identical_payloads(tmp_path):
    db_path = tmp_path / "queue.db"
    queue = mem0_queue.Mem0Queue(db_path=str(db_path), start_replay=False)
    payload = {"agent_id": "shared", "text": "same memory"}

    assert queue._add_to_queue("/memory/add", "POST", payload) is True
    assert queue._add_to_queue("/memory/add", "POST", dict(reversed(payload.items()))) is False
    assert queued_count(db_path) == 1


def test_mem0_server_queues_retryable_provider_exception(monkeypatch, tmp_path):
    module = load_mem0_server(monkeypatch, "mem0_server_under_test")

    class FailingMemory:
        def add(self, *args, **kwargs):
            raise RuntimeError("RESOURCE_EXHAUSTED: quota exceeded")

    class Request:
        headers = {}

    monkeypatch.setattr(module, "QUEUE_DB_PATH", tmp_path / "queue.db")
    monkeypatch.setattr(module, "get_memory", lambda: FailingMemory())

    response = module.add_memory(
        module.AddMemoryRequest(text="Juan sent the Cordant next steps", agent_id="shared"),
        Request(),
    )

    assert response.status == "queued"
    assert response.result["queued"] is True
    assert queued_count(tmp_path / "queue.db") == 1


def test_mem0_server_replay_header_does_not_duplicate_queue(monkeypatch, tmp_path):
    module = load_mem0_server(monkeypatch, "mem0_server_replay_under_test")

    class FailingMemory:
        def add(self, *args, **kwargs):
            raise RuntimeError("RESOURCE_EXHAUSTED: quota exceeded")

    class ReplayRequest:
        headers = {"x-mem0-queue-replay": "1"}

    monkeypatch.setattr(module, "QUEUE_DB_PATH", tmp_path / "queue.db")
    monkeypatch.setattr(module, "get_memory", lambda: FailingMemory())

    with pytest.raises(module.HTTPException):
        module.add_memory(
            module.AddMemoryRequest(text="queued memory", agent_id="shared"),
            ReplayRequest(),
        )

    assert not (tmp_path / "queue.db").exists()
