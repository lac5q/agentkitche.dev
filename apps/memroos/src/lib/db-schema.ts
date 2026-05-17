import { createHash } from 'crypto';
import type Database from 'better-sqlite3';

/**
 * Initializes the SQLite schema for the conversation store.
 * All DDL uses CREATE IF NOT EXISTS — safe to call on every startup.
 */
export function initSchema(db: Database.Database): void {
  // messages: primary conversation store
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY,
      session_id  TEXT    NOT NULL,
      project     TEXT    NOT NULL,
      agent_id    TEXT    NOT NULL,
      role        TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      timestamp   TEXT    NOT NULL,
      cwd         TEXT,
      git_branch  TEXT,
      request_id  TEXT,
      UNIQUE(session_id, request_id)
    );
  `);

  // messages_fts: FTS5 external-content table pointing at messages
  // external content avoids duplicating large text in the FTS index
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts
      USING fts5(
        content,
        project UNINDEXED,
        timestamp UNINDEXED,
        agent_id UNINDEXED,
        content=messages,
        content_rowid=id,
        tokenize='unicode61'
      );
  `);

  // AFTER INSERT trigger keeps FTS index in sync with messages table
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content, project, timestamp, agent_id)
      VALUES (new.id, new.content, new.project, new.timestamp, new.agent_id);
    END;
  `);

  // ingest_meta: tracks JSONL file state for incremental ingestion
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingest_meta (
      file_path   TEXT PRIMARY KEY,
      mtime_ms    INTEGER NOT NULL,
      file_size   INTEGER NOT NULL,
      row_count   INTEGER NOT NULL DEFAULT 0,
      ingested_at TEXT    NOT NULL
    );
  `);

  // meta: key-value store for last_ingest_ts, last_recall_query, etc.
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // hive_actions: append-only cross-agent action log (HIVE-01, HIVE-02, HIVE-05)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hive_actions (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL,
      action_type TEXT    NOT NULL
                  CHECK(action_type IN ('continue','loop','checkpoint','trigger','stop','error')),
      summary     TEXT    NOT NULL,
      artifacts   TEXT,
      session_id  TEXT,
      timestamp   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS hive_actions_agent_ts
      ON hive_actions(agent_id, timestamp DESC);
  `);

  // hive_actions_fts: FTS5 external-content table (same pattern as messages_fts)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS hive_actions_fts
      USING fts5(
        summary,
        agent_id    UNINDEXED,
        action_type UNINDEXED,
        timestamp   UNINDEXED,
        content=hive_actions,
        content_rowid=id,
        tokenize='unicode61'
      );
  `);

  // AFTER INSERT trigger keeps FTS index in sync with hive_actions
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS hive_actions_ai AFTER INSERT ON hive_actions BEGIN
      INSERT INTO hive_actions_fts(rowid, summary, agent_id, action_type, timestamp)
      VALUES (new.id, new.summary, new.agent_id, new.action_type, new.timestamp);
    END;
  `);

  // AFTER DELETE trigger for FTS cleanup (hive_actions is append-only, but ensures correctness)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS hive_actions_ad AFTER DELETE ON hive_actions BEGIN
      INSERT INTO hive_actions_fts(hive_actions_fts, rowid, summary, agent_id, action_type, timestamp)
      VALUES ('delete', old.id, old.summary, old.agent_id, old.action_type, old.timestamp);
    END;
  `);

  // hive_delegations: mutable task tracking with checkpoint recovery (HIVE-03)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hive_delegations (
      id            INTEGER PRIMARY KEY,
      task_id       TEXT    NOT NULL UNIQUE,
      from_agent    TEXT    NOT NULL,
      to_agent      TEXT    NOT NULL,
      task_summary  TEXT    NOT NULL,
      priority      INTEGER NOT NULL DEFAULT 5,
      status        TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','active','paused','completed','failed')),
      checkpoint    TEXT,
      created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS hive_delegations_to_agent
      ON hive_delegations(to_agent, status);
  `);

  // memory_salience: tracks tier, decay score, and access resistance per message (MEM-02)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_salience (
      message_id     INTEGER PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
      tier           TEXT    NOT NULL DEFAULT 'mid'
                     CHECK(tier IN ('pinned','high','mid','low')),
      salience_score REAL    NOT NULL DEFAULT 1.0
                     CHECK(salience_score >= 0.0 AND salience_score <= 1.0),
      access_count   INTEGER NOT NULL DEFAULT 0,
      last_accessed  TEXT,
      last_decay_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS memory_salience_tier
      ON memory_salience(tier, last_decay_at);
  `);

  // memory_consolidation_runs: audit log of consolidation runs (MEM-01)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_consolidation_runs (
      id               INTEGER PRIMARY KEY,
      started_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      completed_at     TEXT,
      batch_size       INTEGER NOT NULL DEFAULT 0,
      insights_written INTEGER NOT NULL DEFAULT 0,
      status           TEXT    NOT NULL DEFAULT 'running'
                       CHECK(status IN ('running','completed','failed')),
      error_message    TEXT
    );
  `);

  // memory_meta_insights: LLM-extracted patterns/contradictions/summaries (MEM-01)
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_meta_insights (
      id           INTEGER PRIMARY KEY,
      run_id       INTEGER NOT NULL REFERENCES memory_consolidation_runs(id),
      insight_type TEXT    NOT NULL
                   CHECK(insight_type IN ('pattern','contradiction','summary')),
      content      TEXT    NOT NULL,
      source_ids   TEXT    NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
  `);

  // Additive migration: add consolidated column to messages (safe on re-run)
  try {
    db.exec('ALTER TABLE messages ADD COLUMN consolidated INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists -- safe to ignore on subsequent startups
  }

  // Additive migration: add context_id to hive_delegations (dispatch chain grouping)
  try {
    db.exec('ALTER TABLE hive_delegations ADD COLUMN context_id TEXT');
  } catch {
    // Column already exists
  }

  // Additive migration: add result to hive_delegations (terminal payload storage)
  try {
    db.exec('ALTER TABLE hive_delegations ADD COLUMN result TEXT');
  } catch {
    // Column already exists
  }

  // One-shot migration: rebuild hive_delegations CHECK constraint to add 'canceled' status.
  // Guarded by meta flag -- SQLite cannot ALTER a CHECK constraint in place.
  const migrated = db
    .prepare(`SELECT value FROM meta WHERE key = 'hive_delegations_v2_migrated'`)
    .get() as { value: string } | undefined;
  if (!migrated) {
    db.exec(`
      CREATE TABLE hive_delegations_new (
        id            INTEGER PRIMARY KEY,
        task_id       TEXT    NOT NULL UNIQUE,
        from_agent    TEXT    NOT NULL,
        to_agent      TEXT    NOT NULL,
        task_summary  TEXT    NOT NULL,
        priority      INTEGER NOT NULL DEFAULT 5,
        status        TEXT    NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','active','paused','completed','failed','canceled')),
        checkpoint    TEXT,
        context_id    TEXT,
        result        TEXT,
        created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
      );
      INSERT INTO hive_delegations_new
        SELECT id, task_id, from_agent, to_agent, task_summary, priority, status,
               checkpoint, context_id, result, created_at, updated_at
        FROM hive_delegations;
      DROP TABLE hive_delegations;
      ALTER TABLE hive_delegations_new RENAME TO hive_delegations;
    `);
    db.prepare(`INSERT OR REPLACE INTO meta(key,value) VALUES('hive_delegations_v2_migrated','1')`).run();
  }

  // Indexes for dispatch query patterns
  db.exec(`
    CREATE INDEX IF NOT EXISTS hive_delegations_context
      ON hive_delegations(context_id);
    CREATE INDEX IF NOT EXISTS hive_delegations_status_priority
      ON hive_delegations(status, priority DESC, created_at ASC);
  `);

  // One-time salience seed: ensures every existing message has a salience row
  db.exec('INSERT OR IGNORE INTO memory_salience(message_id) SELECT id FROM messages');

  // audit_log: immutable record of all significant agent actions (SEC-02)
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id        INTEGER PRIMARY KEY,
      actor     TEXT    NOT NULL,
      action    TEXT    NOT NULL,
      target    TEXT    NOT NULL,
      detail    TEXT,
      severity  TEXT    NOT NULL DEFAULT 'info'
                CHECK(severity IN ('info','medium','high')),
      timestamp TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS audit_log_ts
      ON audit_log(timestamp DESC);
  `);

  // recall_log: time-series tracking of recall queries (ANA-04)
  db.exec(`
    CREATE TABLE IF NOT EXISTS recall_log (
      id        INTEGER PRIMARY KEY,
      query     TEXT    NOT NULL,
      results   INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS recall_log_ts ON recall_log(timestamp);
  `);

  // registered_agents: canonical v2.0 agent registry (REST, UI, future A2A adapters)
  db.exec(`
    CREATE TABLE IF NOT EXISTS registered_agents (
      id                TEXT PRIMARY KEY,
      name              TEXT    NOT NULL,
      role              TEXT    NOT NULL,
      company           TEXT,
      platform          TEXT    NOT NULL,
      protocol          TEXT    NOT NULL
                        CHECK(protocol IN ('rest','a2a','ui','local')),
      status            TEXT    NOT NULL DEFAULT 'dormant'
                        CHECK(status IN ('active','idle','dormant','error')),
      current_task      TEXT,
      last_heartbeat_at TEXT,
      location          TEXT    NOT NULL DEFAULT 'local'
                        CHECK(location IN ('local','tailscale','cloudflare')),
      host              TEXT,
      port              INTEGER,
      health_endpoint   TEXT,
      tunnel_url        TEXT,
      latency_ms        INTEGER,
      metadata          TEXT    NOT NULL DEFAULT '{}',
      created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      deregistered_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS registered_agents_status
      ON registered_agents(status, last_heartbeat_at DESC);
    CREATE INDEX IF NOT EXISTS registered_agents_protocol
      ON registered_agents(protocol);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_api_keys (
      id           INTEGER PRIMARY KEY,
      agent_id     TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      key_prefix   TEXT    NOT NULL,
      key_hash     TEXT    NOT NULL UNIQUE,
      created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      last_used_at TEXT,
      revoked_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS agent_api_keys_hash
      ON agent_api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS agent_api_keys_agent
      ON agent_api_keys(agent_id, revoked_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_capabilities (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      capability_id TEXT  NOT NULL,
      name        TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      tags        TEXT    NOT NULL DEFAULT '[]',
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(agent_id, capability_id)
    );
    CREATE INDEX IF NOT EXISTS agent_capabilities_lookup
      ON agent_capabilities(capability_id, agent_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_skill_reports (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      skill_id    TEXT    NOT NULL,
      action      TEXT    NOT NULL,
      metadata    TEXT    NOT NULL DEFAULT '{}',
      reported_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS agent_skill_reports_agent_ts
      ON agent_skill_reports(agent_id, reported_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory_writes (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      memory_type TEXT,
      content_hash TEXT,
      metadata    TEXT    NOT NULL DEFAULT '{}',
      result      TEXT    NOT NULL DEFAULT '{}',
      written_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS agent_memory_writes_agent_ts
      ON agent_memory_writes(agent_id, written_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tool_outcomes (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      tool_id     TEXT    NOT NULL,
      outcome     TEXT    NOT NULL,
      metadata    TEXT    NOT NULL DEFAULT '{}',
      recorded_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS agent_tool_outcomes_agent_ts
      ON agent_tool_outcomes(agent_id, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS agent_tool_outcomes_tool
      ON agent_tool_outcomes(tool_id, recorded_at DESC);
  `);

  // a2a_tasks / a2a_task_events: durable transport-level task state (Phase 35)
  db.exec(`
    CREATE TABLE IF NOT EXISTS a2a_tasks (
      task_id             TEXT PRIMARY KEY,
      context_id          TEXT NOT NULL,
      caller_agent_id     TEXT NOT NULL,
      target_agent_id     TEXT,
      state               TEXT NOT NULL
                          CHECK(state IN ('submitted','working','input-required','completed','failed','canceled')),
      message_json        TEXT NOT NULL,
      artifacts_json      TEXT NOT NULL DEFAULT '[]',
      metadata_json       TEXT NOT NULL DEFAULT '{}',
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL,
      terminal_at         TEXT,
      cancel_requested_at TEXT
    );
    CREATE INDEX IF NOT EXISTS a2a_tasks_context
      ON a2a_tasks(context_id);
    CREATE INDEX IF NOT EXISTS a2a_tasks_caller_state
      ON a2a_tasks(caller_agent_id, state, updated_at DESC);
    CREATE INDEX IF NOT EXISTS a2a_tasks_target_state
      ON a2a_tasks(target_agent_id, state, updated_at DESC);

    CREATE TABLE IF NOT EXISTS a2a_task_events (
      id           INTEGER PRIMARY KEY,
      task_id      TEXT NOT NULL,
      sequence     INTEGER NOT NULL,
      event_type   TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      UNIQUE(task_id, sequence),
      FOREIGN KEY(task_id) REFERENCES a2a_tasks(task_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS a2a_task_events_task_sequence
      ON a2a_task_events(task_id, sequence);
  `);

  // eval_runs / eval_run_examples: Phase 57 composite W audit history
  db.exec(`
    CREATE TABLE IF NOT EXISTS eval_runs (
      id                       TEXT PRIMARY KEY,
      trace_id                 TEXT NOT NULL,
      agent_id                 TEXT NOT NULL,
      role                     TEXT NOT NULL,
      composite_w              REAL NOT NULL,
      trusted                  INTEGER NOT NULL,
      drift_agreement          REAL NOT NULL,
      drift_status             TEXT NOT NULL,
      layer_breakdown_json     TEXT NOT NULL,
      scorer_results_json      TEXT NOT NULL,
      judge_provider           TEXT NOT NULL,
      judge_model              TEXT NOT NULL,
      judge_model_family       TEXT NOT NULL,
      prompt_template_version  TEXT NOT NULL,
      prompt_hash              TEXT NOT NULL,
      golden_set_path          TEXT NOT NULL,
      golden_set_version       TEXT NOT NULL,
      config_hash              TEXT NOT NULL,
      started_at               TEXT NOT NULL,
      completed_at             TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS eval_runs_completed
      ON eval_runs(completed_at DESC);
    CREATE INDEX IF NOT EXISTS eval_runs_agent
      ON eval_runs(agent_id, completed_at DESC);

    CREATE TABLE IF NOT EXISTS eval_run_examples (
      id            INTEGER PRIMARY KEY,
      run_id        TEXT NOT NULL REFERENCES eval_runs(id) ON DELETE CASCADE,
      example_id    TEXT NOT NULL,
      human_score   REAL NOT NULL,
      judge_score   REAL NOT NULL,
      agreed        INTEGER NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS eval_run_examples_run
      ON eval_run_examples(run_id);
  `);

  // Phase 61: business_outcome_events — adapter pull sink for L3 scorer.
  // tenant_id defaults to 'default-tenant'; Phase 62 backfills real tenant IDs.
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_outcome_events (
      id              INTEGER PRIMARY KEY,
      tenant_id       TEXT    NOT NULL DEFAULT 'default-tenant',
      correlation_id  TEXT    NOT NULL,
      source_system   TEXT    NOT NULL CHECK(source_system IN ('crm','helpdesk','finance')),
      adapter         TEXT    NOT NULL,
      event_type      TEXT    NOT NULL,
      kpi_key         TEXT    NOT NULL,
      kpi_value       REAL    NOT NULL,
      raw_json        TEXT    NOT NULL,
      agent_id        TEXT,
      polled_at       TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(tenant_id, correlation_id, adapter, event_type, polled_at)
    );
    CREATE INDEX IF NOT EXISTS boe_correlation
      ON business_outcome_events(correlation_id);
    CREATE INDEX IF NOT EXISTS boe_agent
      ON business_outcome_events(agent_id, polled_at DESC);
    CREATE INDEX IF NOT EXISTS boe_tenant
      ON business_outcome_events(tenant_id, polled_at DESC);
    CREATE INDEX IF NOT EXISTS boe_adapter
      ON business_outcome_events(adapter, polled_at DESC);
  `);

  const boeSchema = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'business_outcome_events'")
    .get() as { sql: string } | undefined;
  if (boeSchema?.sql.includes("UNIQUE(correlation_id, adapter, event_type, polled_at)")) {
    db.exec(`
      CREATE TABLE business_outcome_events_new (
        id              INTEGER PRIMARY KEY,
        tenant_id       TEXT    NOT NULL DEFAULT 'default-tenant',
        correlation_id  TEXT    NOT NULL,
        source_system   TEXT    NOT NULL CHECK(source_system IN ('crm','helpdesk','finance')),
        adapter         TEXT    NOT NULL,
        event_type      TEXT    NOT NULL,
        kpi_key         TEXT    NOT NULL,
        kpi_value       REAL    NOT NULL,
        raw_json        TEXT    NOT NULL,
        agent_id        TEXT,
        polled_at       TEXT    NOT NULL,
        created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        UNIQUE(tenant_id, correlation_id, adapter, event_type, polled_at)
      );
      INSERT OR IGNORE INTO business_outcome_events_new
        (id, tenant_id, correlation_id, source_system, adapter, event_type,
         kpi_key, kpi_value, raw_json, agent_id, polled_at, created_at)
      SELECT id, tenant_id, correlation_id, source_system, adapter, event_type,
             kpi_key, kpi_value, raw_json, agent_id, polled_at, created_at
      FROM business_outcome_events;
      DROP TABLE business_outcome_events;
      ALTER TABLE business_outcome_events_new RENAME TO business_outcome_events;
    `);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS boe_correlation
      ON business_outcome_events(correlation_id);
    CREATE INDEX IF NOT EXISTS boe_agent
      ON business_outcome_events(agent_id, polled_at DESC);
    CREATE INDEX IF NOT EXISTS boe_tenant
      ON business_outcome_events(tenant_id, polled_at DESC);
    CREATE INDEX IF NOT EXISTS boe_adapter
      ON business_outcome_events(adapter, polled_at DESC);
  `);

  // Phase 60 agent autogen tables — additive only (CREATE TABLE IF NOT EXISTS).

  // agent_instructions: mutation target for agent_instruction_patch proposals
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_instructions (
      id                INTEGER PRIMARY KEY,
      agent_id          TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      instructions_text TEXT    NOT NULL,
      version           INTEGER NOT NULL DEFAULT 1,
      proposal_id       TEXT    REFERENCES seal_proposals(id),
      is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
      created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS agent_instructions_active
      ON agent_instructions(agent_id, is_active, version DESC);
  `);

  // proposed_skills: staging/promotion target for skill_addition proposals.
  // proposal_id is nullable so applyShadow can embed it in diff and update post-persist.
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposed_skills (
      id          INTEGER PRIMARY KEY,
      agent_id    TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      skill_id    TEXT    NOT NULL,
      action      TEXT    NOT NULL,
      metadata    TEXT    NOT NULL DEFAULT '{}',
      proposal_id TEXT    REFERENCES seal_proposals(id),
      status      TEXT    NOT NULL DEFAULT 'proposed'
                  CHECK(status IN ('proposed','promoted','rolled_back')),
      created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS proposed_skills_proposal
      ON proposed_skills(proposal_id, status);
  `);

  // agent_tool_routing_policies: mutation target for tool_routing_update proposals
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_tool_routing_policies (
      id                INTEGER PRIMARY KEY,
      agent_id          TEXT    NOT NULL REFERENCES registered_agents(id) ON DELETE CASCADE,
      tool_name         TEXT    NOT NULL,
      context_pattern   TEXT    NOT NULL DEFAULT '*',
      preference_weight REAL    NOT NULL DEFAULT 1.0,
      proposal_id       TEXT    REFERENCES seal_proposals(id),
      is_active         INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
      created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS agent_tool_routing_active
      ON agent_tool_routing_policies(agent_id, tool_name, is_active);
  `);

  // Phase 62: tenants + tenant_api_keys (multi-tenant public API isolation).
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    INSERT OR IGNORE INTO tenants (id, name) VALUES ('default-tenant', 'Default Tenant');

    CREATE TABLE IF NOT EXISTS tenant_api_keys (
      id         TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      key_hash   TEXT NOT NULL UNIQUE,
      scopes     TEXT NOT NULL DEFAULT 'eval:submit,eval:read,proposals:read',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS tak_tenant ON tenant_api_keys(tenant_id);
    CREATE INDEX IF NOT EXISTS tak_hash   ON tenant_api_keys(key_hash);
  `);

  const internalApiKey = process.env.MEMROOS_INTERNAL_API_KEY;
  const shouldSeedDevInternalKey = process.env.NODE_ENV !== "production";
  if (internalApiKey || shouldSeedDevInternalKey) {
    const key = internalApiKey ?? "memroos-internal-default-key";
    const keyId = internalApiKey ? "tak-internal-env" : "tak-default-internal";
    const defaultKeyHash = createHash("sha256").update(key).digest("hex");
    db.prepare(
      "INSERT OR IGNORE INTO tenant_api_keys (id, tenant_id, key_hash) VALUES (?, ?, ?)"
    ).run(keyId, "default-tenant", defaultKeyHash);
  }

  // Phase 62: additive tenant_id column on eval_runs and eval_run_examples only
  // (seal_proposals and other tables are created later in this function).
  // Those tables are migrated after their CREATE TABLE IF NOT EXISTS statements below.
  for (const table of ["eval_runs", "eval_run_examples"]) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant'`);
    } catch {
      // Column already exists — safe to ignore on re-runs.
    }
  }

  // seal_*: Phase 58 self-improvement substrate. Additive-only DDL.
  db.exec(`
    CREATE TABLE IF NOT EXISTS seal_proposals (
      id                  TEXT PRIMARY KEY,
      trace_id            TEXT NOT NULL,
      run_id              TEXT NOT NULL REFERENCES eval_runs(id),
      agent_id            TEXT NOT NULL,
      proposal_type       TEXT NOT NULL,
      status              TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','approved','rejected','applied','rolled_back')),
      diff_json           TEXT NOT NULL,
      rationale           TEXT NOT NULL,
      forecast_w_delta    REAL NOT NULL,
      baseline_w          REAL NOT NULL,
      baseline_run_id     TEXT NOT NULL REFERENCES eval_runs(id),
      baseline_layer_json TEXT NOT NULL,
      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS seal_proposals_status
      ON seal_proposals(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS seal_proposals_agent
      ON seal_proposals(agent_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS seal_proposal_decisions (
      id          TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL REFERENCES seal_proposals(id),
      action      TEXT NOT NULL CHECK(action IN ('approved','rejected','applied','rolled_back')),
      operator    TEXT NOT NULL,
      reasoning   TEXT,
      decided_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );

    CREATE TABLE IF NOT EXISTS seal_audit_log (
      id              TEXT PRIMARY KEY,
      -- No FK to seal_proposals: an append-only audit log must always record,
      -- even if the referenced proposal is absent or later purged (phase 64).
      proposal_id     TEXT NOT NULL,
      event           TEXT NOT NULL
                      CHECK(event IN ('proposed','approved','rejected','apply_started','apply_succeeded','apply_failed','rolled_back')),
      baseline_w      REAL,
      post_apply_w    REAL,
      delta_l1        REAL,
      delta_l2        REAL,
      delta_l3        REAL,
      delta_composite REAL,
      detail_json     TEXT NOT NULL DEFAULT '{}',
      timestamp       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS seal_audit_log_ts
      ON seal_audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS seal_audit_log_proposal
      ON seal_audit_log(proposal_id, timestamp DESC);
  `);

  // Phase 62: additive tenant_id column on remaining v2.5 tables
  // (created above in this function — safe to migrate now).
  for (const table of [
    "seal_proposals",
    "seal_proposal_decisions",
    "seal_audit_log",
    "agent_instructions",
    "proposed_skills",
    "agent_tool_routing_policies",
  ]) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant'`);
    } catch {
      // Column already exists — safe to ignore on re-runs.
    }
  }

  // Phase 62: indexes for tenant-scoped queries (after all tables and tenant_id columns exist).
  db.exec(`
    CREATE INDEX IF NOT EXISTS eval_runs_tenant
      ON eval_runs(tenant_id, completed_at DESC);
    CREATE INDEX IF NOT EXISTS seal_proposals_tenant
      ON seal_proposals(tenant_id, created_at DESC);
  `);

  // Phase 63: human team member auth tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      display_name  TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      tenant_id     TEXT NOT NULL DEFAULT 'default-tenant'
                    REFERENCES tenants(id) ON DELETE CASCADE,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS users_email ON users(email);
    CREATE INDEX IF NOT EXISTS users_tenant ON users(tenant_id);

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role    TEXT NOT NULL CHECK(role IN ('admin','operator','reviewer')),
      PRIMARY KEY (user_id, role)
    );

    CREATE TABLE IF NOT EXISTS user_api_keys (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash     TEXT NOT NULL UNIQUE,
      label        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      last_used_at TEXT,
      revoked_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS uak_user ON user_api_keys(user_id, revoked_at);
    CREATE INDEX IF NOT EXISTS uak_hash ON user_api_keys(key_hash);

    CREATE TABLE IF NOT EXISTS user_refresh_tokens (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS urt_user ON user_refresh_tokens(user_id, revoked_at);
    CREATE INDEX IF NOT EXISTS urt_hash ON user_refresh_tokens(token_hash);

    CREATE TABLE IF NOT EXISTS team_invitations (
      id         TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      role       TEXT NOT NULL CHECK(role IN ('admin','operator','reviewer')),
      invited_by TEXT NOT NULL REFERENCES users(id),
      email_hint TEXT,
      used_at    TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS inv_token ON team_invitations(token_hash, used_at);
  `);

  // Phase 64: audit_entries unified immutable log (AUDIT-01)
  // Two-layer immutability: SQLite triggers + service code convention (no UPDATE/DELETE exports).
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_entries (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL DEFAULT 'default-tenant'
                    REFERENCES tenants(id),
      actor_id      TEXT NOT NULL,
      actor_role    TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      entity_type   TEXT NOT NULL,
      entity_id     TEXT NOT NULL,
      reason        TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS audit_entries_created
      ON audit_entries(created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_entries_entity
      ON audit_entries(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_entries_event_type
      ON audit_entries(event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_entries_actor
      ON audit_entries(actor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_entries_tenant
      ON audit_entries(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_entries_tenant_event
      ON audit_entries(tenant_id, event_type, created_at DESC);

    CREATE TRIGGER IF NOT EXISTS audit_entries_no_update
      BEFORE UPDATE ON audit_entries
    BEGIN
      SELECT RAISE(ABORT, 'audit_entries is append-only: UPDATE is not permitted');
    END;

    CREATE TRIGGER IF NOT EXISTS audit_entries_no_delete
      BEFORE DELETE ON audit_entries
    BEGIN
      SELECT RAISE(ABORT, 'audit_entries is append-only: DELETE is not permitted');
    END;
  `);

  // Phase 64: hil_escalations — mutable open-work-item state (AUDIT-04)
  // Each lifecycle event (created/resolved/sla_breached) writes to audit_entries.
  db.exec(`
    CREATE TABLE IF NOT EXISTS hil_escalations (
      id              TEXT PRIMARY KEY,
      tenant_id       TEXT NOT NULL DEFAULT 'default-tenant'
                      REFERENCES tenants(id),
      entity_type     TEXT NOT NULL,
      entity_id       TEXT NOT NULL,
      escalation_type TEXT NOT NULL
                      CHECK(escalation_type IN ('agent_escalate','seal_approval','eval_below_threshold')),
      sla_seconds     INTEGER NOT NULL,
      sla_deadline    TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'open'
                      CHECK(status IN ('open','resolved','sla_breached')),
      assigned_to     TEXT REFERENCES users(id),
      opened_by       TEXT NOT NULL,
      resolved_by     TEXT REFERENCES users(id),
      resolution_note TEXT,
      resolved_at     TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE INDEX IF NOT EXISTS hil_status_deadline
      ON hil_escalations(status, sla_deadline ASC);
    CREATE INDEX IF NOT EXISTS hil_tenant_status
      ON hil_escalations(tenant_id, status, sla_deadline ASC);
    CREATE INDEX IF NOT EXISTS hil_entity
      ON hil_escalations(entity_type, entity_id);
  `);

  // Phase 64: one-shot backfill migration (AUDIT-01)
  // Guarded by meta flag; maps legacy seal_audit_log + audit_log rows into audit_entries.
  const backfillDone = db
    .prepare(`SELECT value FROM meta WHERE key = 'audit_entries_backfill_done'`)
    .get() as { value: string } | undefined;
  if (!backfillDone) {
    const sealEventMap: Record<string, string> = {
      proposed: "seal.proposed",
      approved: "seal.approved",
      rejected: "seal.rejected",
      apply_started: "seal.apply_started",
      apply_succeeded: "seal.apply_succeeded",
      apply_failed: "seal.apply_failed",
      rolled_back: "seal.rolled_back",
    };

    type SealAuditRow = {
      id: string;
      proposal_id: string;
      event: string;
      baseline_w: number | null;
      post_apply_w: number | null;
      delta_l1: number | null;
      delta_l2: number | null;
      delta_l3: number | null;
      delta_composite: number | null;
      detail_json: string;
      timestamp: string;
      tenant_id?: string;
    };

    const sealTableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='seal_audit_log'`)
      .get();
    if (sealTableExists) {
      const sealRows = db.prepare("SELECT * FROM seal_audit_log").all() as SealAuditRow[];
      const insertSeal = db.prepare(
        "INSERT OR IGNORE INTO audit_entries (id, tenant_id, actor_id, actor_role, event_type, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const sealBackfill = db.transaction(() => {
        for (const row of sealRows) {
          const eventType = sealEventMap[row.event] ?? `seal.${row.event}`;
          const metadata = JSON.stringify({
            baseline_w: row.baseline_w,
            post_apply_w: row.post_apply_w,
            delta_l1: row.delta_l1,
            delta_l2: row.delta_l2,
            delta_l3: row.delta_l3,
            delta_composite: row.delta_composite,
            ...JSON.parse(row.detail_json || "{}"),
          });
          insertSeal.run(
            `seal-backfill-${row.id}`,
            row.tenant_id ?? "default-tenant",
            "system",
            "system",
            eventType,
            "seal_proposal",
            `seal_proposal:${row.proposal_id}`,
            metadata,
            row.timestamp
          );
        }
      });
      sealBackfill();
    }

    type AuditLogRow = {
      id: number;
      actor: string;
      action: string;
      target: string;
      detail: string | null;
      severity: string;
      timestamp: string;
    };
    const auditTableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'`)
      .get();
    if (auditTableExists) {
      const auditRows = db.prepare("SELECT * FROM audit_log").all() as AuditLogRow[];
      const insertAudit = db.prepare(
        "INSERT OR IGNORE INTO audit_entries (id, tenant_id, actor_id, actor_role, event_type, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const auditBackfill = db.transaction(() => {
        for (const row of auditRows) {
          const metadata = JSON.stringify({
            severity: row.severity,
            legacy_action: row.action,
            legacy_detail: row.detail,
          });
          insertAudit.run(
            `audit-backfill-${row.id}`,
            "default-tenant",
            row.actor,
            "system",
            `agent.${row.action}`,
            "agent",
            `agent:${row.target}`,
            metadata,
            row.timestamp
          );
        }
      });
      auditBackfill();
    }

    db.prepare(`INSERT OR REPLACE INTO meta(key,value) VALUES('audit_entries_backfill_done','1')`).run();
  }
}
