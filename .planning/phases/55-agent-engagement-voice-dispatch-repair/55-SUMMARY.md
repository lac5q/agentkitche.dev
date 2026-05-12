# Phase 55 Summary: Agent Engagement Voice + Dispatch Repair

Status: complete
Completed: 2026-05-11

## Goal

Replace the broken scattered voice/chat/dispatch experience with one short, usable engagement page where active agents can be chatted with, voice prompted, tested, and included in standup or conference-style queued engagements.

## Completed

- Replaced `/dispatch` with a centralized Agent Engagement UI.
- Removed the old Voice & Chat panel from the main overview page.
- Added chat, voice, standup, and conference modes with label descriptions/tooltips.
- Added a diagnostics API at `/api/engagement/test` that checks each agent's chat runner, dispatch adapter, and voice/TTS prerequisites.
- Fixed dispatch so local registered agents are accepted and queued through the existing adapters instead of only accepting remote transport agents.
- Fixed the Timeline drawer nested-button hydration warning.
- Fixed mobile horizontal overflow in the workspace shell.

## Runtime Findings

- Dispatch now works for local registered agents; verification queued a diagnostic task for `heartbeat-agent`.
- Anthropic live chat still returns provider `429 usage limit exceeded (2056)`, so the app now surfaces this as an operator-readable chat failure instead of raw JSON.
- Qwen/Gemini/OpenCode-routed chat reports blocked when `KITCHEN_ENABLE_OPENCODE` is not enabled.
- Voice diagnostics report TTS configured when `ELEVENLABS_API_KEY` exists; browser speech recognition remains a browser capability checked by the UI.

## Verification

- Focused tests: `20 passed`.
- Full test suite: `512 passed`.
- Typecheck: passed.
- Lint: passed with 11 existing warnings.
- Build: passed with existing Turbopack NFT warnings around `/api/apo`.
- Browser QA: `/dispatch` desktop and mobile render with no console errors; mobile has no horizontal overflow.
