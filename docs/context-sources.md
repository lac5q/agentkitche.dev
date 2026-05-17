# Context Source Contracts

Memoroos treats context lanes as product-owned sources, not invisible local
machine state. `context-sources.config.json` declares each source, required
tools/env, source path, freshness threshold, qmd collection, repair command, and
safe-answer policy.

## Proving A Source Is Safe

1. `GET /api/context/health` returns `ok` for the source.
2. `documentCount` is greater than zero for static source lanes.
3. `ageMinutes` is below `freshnessThresholdMinutes`.
4. `qmdCollection` is present for qmd-backed lanes.
5. Source-backed tasks pass `requireFreshContextSources()` before answering.

When a required source is stale or missing, agents should return `SOURCE_STALE`
or `SOURCE_MISSING` and ask for the source lane to be repaired. They should not
reconstruct meeting notes, email context, or source-backed artifacts from
adjacent summaries unless Luis explicitly asks for reconstruction.

## Runtime Services

Use:

```bash
node scripts/install-runtime-services.mjs check
node scripts/install-runtime-services.mjs install
node scripts/install-runtime-services.mjs status
node scripts/install-runtime-services.mjs uninstall
```

Generated launchd jobs read `.env` through `MEMOROOS_ENV_FILE`; secrets are not
embedded in committed plist templates.
