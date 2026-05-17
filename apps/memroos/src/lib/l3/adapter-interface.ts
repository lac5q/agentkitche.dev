/**
 * Phase 61 — Business-Ops Outcome Layer (L3)
 * BusinessSystemAdapter interface: adapters implement this and are polled by
 * the poller on a schedule.  They write to `business_outcome_events`; the L3
 * scorer reads from that table synchronously.
 */

import type { BusinessOutcomeCategory, BusinessOutcomeEvent } from "./types";

export interface BusinessSystemAdapter {
  /** Stable adapter identifier, e.g. "hubspot". */
  readonly name: string;
  /** Source category used to bucket events. */
  readonly category: BusinessOutcomeCategory;
  /**
   * Fetch business-outcome events from the external system for the given
   * correlation IDs.  Adapters should be idempotent — the poller may call this
   * multiple times for the same correlation ID.
   *
   * @param since - Only return events observed after this timestamp.
   */
  poll(since: Date): Promise<BusinessOutcomeEvent[]>;
}
