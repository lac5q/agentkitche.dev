/**
 * Phase 61 — Intercom Helpdesk adapter (live v1).
 *
 * Reads conversation resolution, CSAT rating, and escalation signals from the
 * Intercom REST API v2.12.  Correlation IDs are read from the conversation
 * custom attribute named by `INTERCOM_CORRELATION_FIELD` env var.
 *
 * Required env vars (live mode):
 *   INTERCOM_ACCESS_TOKEN  — Intercom private app access token
 *
 * Set `mock: true` to return fixture data without hitting the Intercom API.
 */

import type { BusinessSystemAdapter } from "../adapter-interface";
import type { BusinessOutcomeEvent, L3AdapterConfig } from "../types";

const CORRELATION_FIELD = process.env.INTERCOM_CORRELATION_FIELD ?? "memroos_correlation_id";

/** Fixture events returned when mock mode is active. */
function fixtureEvents(since: Date): BusinessOutcomeEvent[] {
  return [
    {
      tenantId: "default-tenant",
      correlationId: "fixture-intercom-001",
      sourceSystem: "helpdesk",
      adapter: "intercom",
      eventType: "conversation_resolved",
      kpiKey: "completion_rate",
      kpiValue: 1,
      rawJson: JSON.stringify({
        conversationId: "CONV-001",
        state: "resolved",
        correlationId: "fixture-intercom-001",
      }),
      polledAt: since.toISOString(),
    },
    {
      tenantId: "default-tenant",
      correlationId: "fixture-intercom-001",
      sourceSystem: "helpdesk",
      adapter: "intercom",
      eventType: "csat_rating",
      kpiKey: "approval_rate",
      kpiValue: 0.9,
      rawJson: JSON.stringify({
        conversationId: "CONV-001",
        csatScore: 5,
        correlationId: "fixture-intercom-001",
      }),
      polledAt: since.toISOString(),
    },
    {
      tenantId: "default-tenant",
      correlationId: "fixture-intercom-001",
      sourceSystem: "helpdesk",
      adapter: "intercom",
      eventType: "escalation",
      kpiKey: "escalation_rate",
      kpiValue: 0,
      rawJson: JSON.stringify({
        conversationId: "CONV-001",
        escalated: false,
        correlationId: "fixture-intercom-001",
      }),
      polledAt: since.toISOString(),
    },
  ];
}

async function fetchConversationsFromIntercom(since: Date): Promise<BusinessOutcomeEvent[]> {
  const accessToken = process.env.INTERCOM_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[intercom] INTERCOM_ACCESS_TOKEN not set — returning empty events");
    return [];
  }

  const sinceTs = Math.floor(since.getTime() / 1000);
  const res = await fetch(
    `https://api.intercom.io/conversations?updated_since=${sinceTs}&display_as=plaintext`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Intercom-Version": "2.12",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[intercom] Conversations fetch failed ${res.status}: ${text}`);
    return [];
  }

  const json = (await res.json()) as {
    conversations: Array<{
      id: string;
      state: string;
      open: boolean;
      waiting_since: number | null;
      snoozed_until: number | null;
      custom_attributes: Record<string, unknown>;
      statistics?: {
        first_response_time: number | null;
        time_to_assignment: number | null;
        median_time_to_reply: number | null;
        time_to_first_close: number | null;
        count_reopens: number;
      };
      conversation_rating?: { rating: number | null } | null;
      tags?: { tags: Array<{ name: string }> };
    }>;
  };

  const events: BusinessOutcomeEvent[] = [];
  for (const conv of json.conversations ?? []) {
    const correlationId = conv.custom_attributes[CORRELATION_FIELD];
    if (typeof correlationId !== "string" || !correlationId) continue;

    const polledAt = new Date().toISOString();
    const isResolved = conv.state === "closed";

    // Resolution event
    events.push({
      tenantId: "default-tenant",
      correlationId,
      sourceSystem: "helpdesk",
      adapter: "intercom",
      eventType: "conversation_resolved",
      kpiKey: "completion_rate",
      kpiValue: isResolved ? 1 : 0.5,
      rawJson: JSON.stringify({ id: conv.id, state: conv.state }),
      polledAt,
    });

    // CSAT rating
    const rating = conv.conversation_rating?.rating ?? null;
    if (typeof rating === "number") {
      events.push({
        tenantId: "default-tenant",
        correlationId,
        sourceSystem: "helpdesk",
        adapter: "intercom",
        eventType: "csat_rating",
        kpiKey: "approval_rate",
        kpiValue: Math.min(1, Math.max(0, (rating - 1) / 4)),
        rawJson: JSON.stringify({ id: conv.id, rating }),
        polledAt,
      });
    }

    // Escalation signal — presence of "escalated" tag
    const escalated = (conv.tags?.tags ?? []).some((t) => t.name.toLowerCase() === "escalated");
    events.push({
      tenantId: "default-tenant",
      correlationId,
      sourceSystem: "helpdesk",
      adapter: "intercom",
      eventType: "escalation",
      kpiKey: "escalation_rate",
      kpiValue: escalated ? 0 : 1,
      rawJson: JSON.stringify({ id: conv.id, escalated }),
      polledAt,
    });

    // TTR signal
    const ttrSecs = conv.statistics?.time_to_first_close ?? null;
    if (typeof ttrSecs === "number") {
      events.push({
        tenantId: "default-tenant",
        correlationId,
        sourceSystem: "helpdesk",
        adapter: "intercom",
        eventType: "time_to_resolution",
        kpiKey: "ttr_p50",
        // Score: <=60s => 1.0, decays toward 0 at 10 min+
        kpiValue: ttrSecs <= 60 ? 1 : Math.max(0.2, 1 - ttrSecs / 600),
        rawJson: JSON.stringify({ id: conv.id, ttrSecs }),
        polledAt,
      });
    }
  }

  return events;
}

export function createIntercomAdapter(config: Pick<L3AdapterConfig, "mock"> = { mock: false }): BusinessSystemAdapter {
  return {
    name: "intercom",
    category: "helpdesk",
    async poll(since: Date): Promise<BusinessOutcomeEvent[]> {
      if (config.mock) {
        return fixtureEvents(since);
      }
      return fetchConversationsFromIntercom(since);
    },
  };
}
