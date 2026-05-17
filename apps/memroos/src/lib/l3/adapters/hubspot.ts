/**
 * Phase 61 — HubSpot CRM adapter (live v1).
 *
 * Reads deal-stage advancement and lead-disposition signals from the HubSpot v3
 * Deals API.  Correlation IDs are stored as a HubSpot deal property named by
 * the `HUBSPOT_CORRELATION_FIELD` env var (default: "memroos_correlation_id").
 *
 * Required env vars (live mode):
 *   HUBSPOT_ACCESS_TOKEN   — private-app access token or OAuth bearer token
 *   HUBSPOT_PORTAL_ID      — numeric portal / hub ID
 *
 * Set `mock: true` in the adapter config (or use `createHubSpotAdapter({mock: true})`)
 * to return fixture data without hitting the HubSpot API.
 */

import type { BusinessSystemAdapter, } from "../adapter-interface";
import type { BusinessOutcomeEvent, L3AdapterConfig } from "../types";

const CORRELATION_FIELD = process.env.HUBSPOT_CORRELATION_FIELD ?? "memroos_correlation_id";

/** Fixture events returned when mock mode is active. */
function fixtureEvents(since: Date): BusinessOutcomeEvent[] {
  return [
    {
      tenantId: "default-tenant",
      correlationId: "fixture-hubspot-001",
      sourceSystem: "crm",
      adapter: "hubspot",
      eventType: "deal_advance",
      kpiKey: "completion_rate",
      kpiValue: 1,
      rawJson: JSON.stringify({
        dealId: "DEAL-001",
        stage: "closedwon",
        correlationId: "fixture-hubspot-001",
      }),
      polledAt: since.toISOString(),
    },
    {
      tenantId: "default-tenant",
      correlationId: "fixture-hubspot-001",
      sourceSystem: "crm",
      adapter: "hubspot",
      eventType: "lead_disposition",
      kpiKey: "approval_rate",
      kpiValue: 1,
      rawJson: JSON.stringify({
        dealId: "DEAL-001",
        disposition: "qualified",
        correlationId: "fixture-hubspot-001",
      }),
      polledAt: since.toISOString(),
    },
  ];
}

async function fetchDealsFromHubSpot(since: Date): Promise<BusinessOutcomeEvent[]> {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[hubspot] HUBSPOT_ACCESS_TOKEN not set — returning empty events");
    return [];
  }

  const sinceTs = Math.floor(since.getTime());
  const searchBody = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "hs_lastmodifieddate",
            operator: "GTE",
            value: String(sinceTs),
          },
        ],
      },
    ],
    properties: ["dealname", "dealstage", "closedate", CORRELATION_FIELD, "hs_lastmodifieddate"],
    limit: 100,
  };

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[hubspot] Deal search failed ${res.status}: ${text}`);
    return [];
  }

  const json = (await res.json()) as {
    results: Array<{
      id: string;
      properties: Record<string, string | null>;
    }>;
  };

  const events: BusinessOutcomeEvent[] = [];
  for (const deal of json.results ?? []) {
    const correlationId = deal.properties[CORRELATION_FIELD];
    if (!correlationId) continue;
    const stage = deal.properties.dealstage ?? "";
    const polledAt = new Date().toISOString();
    const isClosed = stage === "closedwon" || stage === "closedlost";
    const completionRate = stage === "closedwon" ? 1 : stage === "closedlost" ? 0 : 0.5;

    events.push({
      tenantId: "default-tenant",
      correlationId,
      sourceSystem: "crm",
      adapter: "hubspot",
      eventType: "deal_advance",
      kpiKey: "completion_rate",
      kpiValue: completionRate,
      rawJson: JSON.stringify(deal.properties),
      polledAt,
    });

    if (isClosed) {
      events.push({
        tenantId: "default-tenant",
        correlationId,
        sourceSystem: "crm",
        adapter: "hubspot",
        eventType: "lead_disposition",
        kpiKey: "approval_rate",
        kpiValue: stage === "closedwon" ? 1 : 0,
        rawJson: JSON.stringify(deal.properties),
        polledAt,
      });
    }
  }

  return events;
}

export function createHubSpotAdapter(config: Pick<L3AdapterConfig, "mock"> = { mock: false }): BusinessSystemAdapter {
  return {
    name: "hubspot",
    category: "crm",
    async poll(since: Date): Promise<BusinessOutcomeEvent[]> {
      if (config.mock) {
        return fixtureEvents(since);
      }
      return fetchDealsFromHubSpot(since);
    },
  };
}
