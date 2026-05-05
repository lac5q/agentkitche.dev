# Phase 39 Decisions: Developer Setup Experience

## Choices Made

1. **Keep setup bash-first and wizard Node-based.**
   Why: `setup.sh` is best for prereq checks and compose startup; Node is better for profile/env validation and interactive prompts.

2. **Do not auto-register a fake first agent.**
   Why: Agent registration mints credentials and depends on the operator's actual agent topology. The wizard prepares the first-agent ID and points to the UI/API registration path.

3. **Keep live Qdrant validation in setup.**
   Why: v2.0 requires fail-fast cloud vector validation. `SKIP_QDRANT_CHECK=1` exists for deterministic CI/local smoke only.
