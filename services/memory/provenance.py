"""Memory provenance helpers shared by mem0 HTTP and MCP adapters."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

PROVENANCE_KEYS = (
    "source",
    "source_type",
    "source_title",
    "source_url",
    "source_path",
    "source_id",
    "captured_at",
    "ingested_at",
    "saved_by_agent",
)


def utc_now_iso() -> str:
    """Return an ISO timestamp with an explicit UTC suffix."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_metadata(
    metadata: dict[str, Any] | None,
    *,
    agent_id: str,
    default_source: str,
    default_source_type: str = "agent_memory",
) -> dict[str, Any]:
    """Attach a compact provenance envelope while preserving caller metadata."""
    normalized = dict(metadata or {})
    normalized.setdefault("source", default_source)
    normalized.setdefault("source_type", default_source_type)
    normalized.setdefault("saved_by_agent", agent_id)
    normalized.setdefault("ingested_at", utc_now_iso())
    return normalized


def extract_metadata(memory: Any) -> dict[str, Any]:
    """Find metadata in the common shapes returned by mem0/vector stores."""
    if not isinstance(memory, dict):
        return {}

    candidates = [
        memory.get("metadata"),
        memory.get("payload", {}).get("metadata") if isinstance(memory.get("payload"), dict) else None,
        memory.get("payload") if isinstance(memory.get("payload"), dict) else None,
    ]
    for candidate in candidates:
        if isinstance(candidate, dict):
            metadata = dict(candidate)
            break
    else:
        metadata = {}

    for key in PROVENANCE_KEYS:
        if key in memory and key not in metadata:
            metadata[key] = memory[key]
    return metadata


def provenance_label(memory: Any) -> str:
    """Render source metadata for agent-facing memory search output."""
    metadata = extract_metadata(memory)
    if not metadata:
        return "source: unknown"

    parts = []
    source_type = metadata.get("source_type")
    source = metadata.get("source")
    if source_type and source:
        parts.append(f"source: {source_type}/{source}")
    elif source:
        parts.append(f"source: {source}")
    elif source_type:
        parts.append(f"source: {source_type}")
    else:
        parts.append("source: unknown")

    for key, label in (
        ("source_title", "title"),
        ("source_url", "url"),
        ("source_path", "path"),
        ("source_id", "id"),
        ("captured_at", "captured"),
        ("ingested_at", "ingested"),
        ("saved_by_agent", "saved_by"),
    ):
        value = metadata.get(key)
        if value:
            parts.append(f"{label}: {value}")

    return " | ".join(parts)


def memory_text(memory: Any) -> str:
    """Extract the human memory text from common mem0 result shapes."""
    if isinstance(memory, dict):
        return str(memory.get("memory", memory.get("text", memory)))
    return str(memory)


def format_memory_result(index: int, memory: Any) -> str:
    """Format one memory with relevance and provenance for agent consumption."""
    text = memory_text(memory)
    score = memory.get("score", "") if isinstance(memory, dict) else ""
    score_str = f" (relevance: {score:.2f})" if isinstance(score, float) else ""
    return f"{index}. {text}{score_str}\n   [{provenance_label(memory)}]"
