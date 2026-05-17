# Phase 30 Plan 02 Summary: Similar-Task Recommendations

## Status

Complete.

## What Shipped

- Added safe context normalization and metadata extraction for outcome records.
- Added per-tool `contextSignals` aggregation from searchable outcome metadata.
- Added context-aware boosting in `discover`.
- Added `similarTaskRecommendations` to discovery responses.
- Added optional context inputs to direct MCP `tool_discover` and workspace `tool-attention` `discover` action.

## Files Changed

- `services/knowledge-mcp/knowledge_system/tool_attention.py`
- `services/knowledge-mcp/knowledge_system/mcp_server.py`
- `services/knowledge-mcp/tests/test_knowledge_system.py`

## Verification

`PYTHONPATH=services/knowledge-mcp "$HOME/github/knowledge/.venv/bin/python" -m pytest services/knowledge-mcp/tests/test_knowledge_system.py`

`PYTHONPATH=services/knowledge-mcp "$HOME/github/knowledge/.venv/bin/python" -m py_compile services/knowledge-mcp/knowledge_system/tool_attention.py services/knowledge-mcp/knowledge_system/mcp_server.py`

Result: all checks passed.

## Next

Phase 31: Memroos Tool Gateway Operations UI.
