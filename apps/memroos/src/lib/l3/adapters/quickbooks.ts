/**
 * Phase 61 — QuickBooks Online finance adapter (live v1).
 *
 * Reads invoice-paid and payment-reconciled signals from the QuickBooks Online
 * v3 REST API (OAuth2).  Correlation IDs are stored as a custom field on the
 * invoice named by `QUICKBOOKS_CORRELATION_FIELD` env var.
 *
 * Required env vars (live mode):
 *   QUICKBOOKS_CLIENT_ID       — QBO OAuth2 client ID
 *   QUICKBOOKS_CLIENT_SECRET   — QBO OAuth2 client secret
 *   QUICKBOOKS_REFRESH_TOKEN   — long-lived refresh token
 *   QUICKBOOKS_REALM_ID        — company realm ID (e.g. "123456789")
 *
 * Set `mock: true` to return fixture data.
 */

import type { BusinessSystemAdapter } from "../adapter-interface";
import type { BusinessOutcomeEvent, L3AdapterConfig } from "../types";

const CORRELATION_FIELD = process.env.QUICKBOOKS_CORRELATION_FIELD ?? "memroos_correlation_id";
const QBO_BASE = "https://quickbooks.api.intuit.com/v3/company";

/** Fixture events returned when mock mode is active. */
function fixtureEvents(since: Date): BusinessOutcomeEvent[] {
  return [
    {
      tenantId: "default-tenant",
      correlationId: "fixture-qbo-001",
      sourceSystem: "finance",
      adapter: "quickbooks",
      eventType: "transaction_posted",
      kpiKey: "completion_rate",
      kpiValue: 1,
      rawJson: JSON.stringify({
        invoiceId: "INV-001",
        balance: 0,
        totalAmt: 500,
        correlationId: "fixture-qbo-001",
      }),
      polledAt: since.toISOString(),
    },
    {
      tenantId: "default-tenant",
      correlationId: "fixture-qbo-001",
      sourceSystem: "finance",
      adapter: "quickbooks",
      eventType: "payment_reconciled",
      kpiKey: "approval_rate",
      kpiValue: 1,
      rawJson: JSON.stringify({
        invoiceId: "INV-001",
        paymentStatus: "paid",
        correlationId: "fixture-qbo-001",
      }),
      polledAt: since.toISOString(),
    },
  ];
}

async function refreshAccessToken(): Promise<string | null> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const refreshToken = process.env.QUICKBOOKS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("[quickbooks] OAuth credentials not set — cannot refresh token");
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[quickbooks] Token refresh failed ${res.status}: ${text}`);
    return null;
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function fetchInvoicesFromQBO(since: Date): Promise<BusinessOutcomeEvent[]> {
  const realmId = process.env.QUICKBOOKS_REALM_ID;
  if (!realmId) {
    console.warn("[quickbooks] QUICKBOOKS_REALM_ID not set — returning empty events");
    return [];
  }

  const accessToken = await refreshAccessToken();
  if (!accessToken) return [];

  const sinceDate = since.toISOString().split("T")[0];
  const query = `SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime >= '${sinceDate}' MAXRESULTS 100`;
  const encodedQuery = encodeURIComponent(query);

  const res = await fetch(`${QBO_BASE}/${realmId}/query?query=${encodedQuery}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[quickbooks] Invoice query failed ${res.status}: ${text}`);
    return [];
  }

  const json = (await res.json()) as {
    QueryResponse?: {
      Invoice?: Array<{
        Id: string;
        Balance: number;
        TotalAmt: number;
        CustomField?: Array<{ Name: string; StringValue?: string }>;
        MetaData: { LastUpdatedTime: string };
      }>;
    };
  };

  const events: BusinessOutcomeEvent[] = [];
  for (const invoice of json.QueryResponse?.Invoice ?? []) {
    const correlationField = (invoice.CustomField ?? []).find((f) => f.Name === CORRELATION_FIELD);
    const correlationId = correlationField?.StringValue;
    if (!correlationId) continue;

    const polledAt = new Date().toISOString();
    const isPaid = invoice.Balance === 0 && invoice.TotalAmt > 0;

    events.push({
      tenantId: "default-tenant",
      correlationId,
      sourceSystem: "finance",
      adapter: "quickbooks",
      eventType: "transaction_posted",
      kpiKey: "completion_rate",
      kpiValue: isPaid ? 1 : 0.5,
      rawJson: JSON.stringify(invoice),
      polledAt,
    });

    if (isPaid) {
      events.push({
        tenantId: "default-tenant",
        correlationId,
        sourceSystem: "finance",
        adapter: "quickbooks",
        eventType: "payment_reconciled",
        kpiKey: "approval_rate",
        kpiValue: 1,
        rawJson: JSON.stringify(invoice),
        polledAt,
      });
    }
  }

  return events;
}

export function createQuickBooksAdapter(config: Pick<L3AdapterConfig, "mock"> = { mock: false }): BusinessSystemAdapter {
  return {
    name: "quickbooks",
    category: "finance",
    async poll(since: Date): Promise<BusinessOutcomeEvent[]> {
      if (config.mock) {
        return fixtureEvents(since);
      }
      return fetchInvoicesFromQBO(since);
    },
  };
}
