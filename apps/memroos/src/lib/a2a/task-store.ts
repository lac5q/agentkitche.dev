import { getDb } from "@/lib/db";
import { A2A_TASK_STATES, type A2aMessage, type A2aTask, type A2aTaskState } from "./types";

const TASK_STATES = new Set<string>(A2A_TASK_STATES);
const TERMINAL_STATES = new Set<A2aTaskState>(["completed", "failed", "canceled"]);

interface A2aTaskRow {
  task_id: string;
  context_id: string;
  caller_agent_id: string;
  target_agent_id: string | null;
  state: A2aTaskState;
  message_json: string;
  artifacts_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
  terminal_at: string | null;
  cancel_requested_at: string | null;
}

interface A2aTaskEventRow {
  id: number;
  task_id: string;
  sequence: number;
  event_type: string;
  payload_json: string;
  created_at: string;
}

export interface CreateA2aTaskInput {
  taskId: string;
  contextId: string;
  callerAgentId: string;
  targetAgentId?: string | null;
  message: A2aMessage;
  metadata?: Record<string, unknown>;
}

export interface A2aTaskRecord {
  task: A2aTask;
  callerAgentId: string;
  targetAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  terminalAt: string | null;
  cancelRequestedAt: string | null;
  events: A2aStoredTaskEvent[];
}

export interface A2aStoredTaskEvent {
  id: number;
  taskId: string;
  sequence: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function stringify(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parseObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseMessage(raw: string): A2aMessage {
  return parseObject(raw) as unknown as A2aMessage;
}

function rowToTask(row: A2aTaskRow): A2aTask {
  return {
    id: row.task_id,
    contextId: row.context_id,
    status: {
      state: row.state,
      message: parseMessage(row.message_json),
      timestamp: row.updated_at,
    },
    history: [parseMessage(row.message_json)],
    artifacts: parseArray(row.artifacts_json) as A2aTask["artifacts"],
    metadata: parseObject(row.metadata_json),
  };
}

function rowToEvent(row: A2aTaskEventRow): A2aStoredTaskEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    sequence: row.sequence,
    eventType: row.event_type,
    payload: parseObject(row.payload_json),
    createdAt: row.created_at,
  };
}

export function serializeA2aTask(row: A2aTaskRow): A2aTask {
  return rowToTask(row);
}

export function createA2aTask(input: CreateA2aTaskInput): A2aTask {
  const timestamp = nowIso();
  getDb()
    .prepare(
      `INSERT INTO a2a_tasks (
         task_id, context_id, caller_agent_id, target_agent_id, state,
         message_json, artifacts_json, metadata_json, created_at, updated_at
       ) VALUES (
         @taskId, @contextId, @callerAgentId, @targetAgentId, 'submitted',
         @messageJson, '[]', @metadataJson, @timestamp, @timestamp
       )`
    )
    .run({
      taskId: input.taskId,
      contextId: input.contextId,
      callerAgentId: input.callerAgentId,
      targetAgentId: input.targetAgentId ?? null,
      messageJson: JSON.stringify(input.message),
      metadataJson: stringify(input.metadata ?? {}),
      timestamp,
    });

  return getA2aTask(input.taskId)!.task;
}

export function appendA2aTaskEvent(
  taskId: string,
  eventType: string,
  payload: Record<string, unknown>
): A2aStoredTaskEvent {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM a2a_task_events WHERE task_id = ?")
    .get(taskId) as { next_sequence: number };
  const timestamp = nowIso();
  const result = db
    .prepare(
      `INSERT INTO a2a_task_events (task_id, sequence, event_type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(taskId, row.next_sequence, eventType, JSON.stringify(payload), timestamp);

  return {
    id: Number(result.lastInsertRowid),
    taskId,
    sequence: row.next_sequence,
    eventType,
    payload,
    createdAt: timestamp,
  };
}

export function transitionA2aTask(
  taskId: string,
  state: A2aTaskState,
  patch: { artifacts?: unknown[]; metadata?: Record<string, unknown>; cancelRequestedAt?: string } = {}
): A2aTask {
  if (!TASK_STATES.has(state)) {
    throw new Error(`Invalid A2A task state: ${state}`);
  }

  const existing = getA2aTask(taskId);
  if (!existing) {
    throw new Error(`Unknown A2A task: ${taskId}`);
  }

  const timestamp = nowIso();
  const metadata = patch.metadata ?? existing.task.metadata ?? {};
  const artifacts = patch.artifacts ?? existing.task.artifacts ?? [];
  const terminalAt = TERMINAL_STATES.has(state) ? timestamp : null;

  getDb()
    .prepare(
      `UPDATE a2a_tasks
       SET state = @state,
           artifacts_json = @artifactsJson,
           metadata_json = @metadataJson,
           updated_at = @updatedAt,
           terminal_at = @terminalAt,
           cancel_requested_at = COALESCE(@cancelRequestedAt, cancel_requested_at)
       WHERE task_id = @taskId`
    )
    .run({
      taskId,
      state,
      artifactsJson: JSON.stringify(artifacts),
      metadataJson: JSON.stringify(metadata),
      updatedAt: timestamp,
      terminalAt,
      cancelRequestedAt: patch.cancelRequestedAt ?? null,
    });

  return getA2aTask(taskId)!.task;
}

export function getA2aTask(taskId: string): A2aTaskRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM a2a_tasks WHERE task_id = ?").get(taskId) as A2aTaskRow | undefined;
  if (!row) return null;

  const events = db
    .prepare("SELECT * FROM a2a_task_events WHERE task_id = ? ORDER BY sequence ASC")
    .all(taskId) as A2aTaskEventRow[];

  return {
    task: rowToTask(row),
    callerAgentId: row.caller_agent_id,
    targetAgentId: row.target_agent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    terminalAt: row.terminal_at,
    cancelRequestedAt: row.cancel_requested_at,
    events: events.map(rowToEvent),
  };
}

export function listA2aTasksForAgent(agentId: string): A2aTask[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM a2a_tasks
       WHERE caller_agent_id = @agentId OR target_agent_id = @agentId
       ORDER BY updated_at DESC`
    )
    .all({ agentId }) as A2aTaskRow[];

  return rows.map(rowToTask);
}
