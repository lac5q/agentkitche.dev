/**
 * Phase 62: Token-bucket rate limiter per tenant_id.
 *
 * In-memory LRU map capped at MAX_TENANTS entries.
 * On a cold start (or server restart) all buckets reset — acceptable for v1
 * single-instance deployments.
 *
 * v2: replace the LruBucketMap with a Redis-backed store for multi-instance.
 */

import type { PublicApiRateLimitConfig } from "@/lib/evals/types";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix epoch seconds
  retryAfterMs?: number;
}

interface Bucket {
  tokens: number;
  lastRefillAt: number; // ms since epoch
}

const MAX_TENANTS = 1000;

/** Simple LRU map: on overflow, evict the oldest (first) inserted entry. */
class LruBucketMap {
  private readonly map = new Map<string, Bucket>();

  get(key: string): Bucket | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Refresh insertion order (LRU touch).
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: string, bucket: Bucket): void {
    if (this.map.size >= MAX_TENANTS && !this.map.has(key)) {
      // Evict oldest entry.
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, bucket);
  }
}

const buckets = new LruBucketMap();

/**
 * Checks and consumes one token from the tenant's bucket.
 *
 * Uses a token-bucket algorithm:
 * - Bucket capacity = `config.burst`
 * - Refill rate: tokens are replenished at `requestsPerMinute / 60` tokens/second,
 *   applied as a lump on each call based on elapsed time since last refill.
 */
export function checkRateLimit(
  tenantId: string,
  config: PublicApiRateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const refillRatePerMs = config.requestsPerMinute / 60_000; // tokens per ms
  const capacity = config.burst;

  let bucket = buckets.get(tenantId);
  if (!bucket) {
    bucket = { tokens: capacity, lastRefillAt: now };
  }

  // Refill tokens based on elapsed time.
  const elapsed = now - bucket.lastRefillAt;
  const newTokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs);
  bucket.tokens = newTokens;
  bucket.lastRefillAt = now;

  if (bucket.tokens < 1) {
    // Compute how many ms until one token is available.
    const msUntilToken = (1 - bucket.tokens) / refillRatePerMs;
    const resetAt = Math.ceil((now + msUntilToken) / 1000);
    buckets.set(tenantId, bucket);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: Math.ceil(msUntilToken),
    };
  }

  bucket.tokens -= 1;
  const remaining = Math.floor(bucket.tokens);
  const msUntilFull = (capacity - bucket.tokens) / refillRatePerMs;
  const resetAt = Math.ceil((now + msUntilFull) / 1000);

  buckets.set(tenantId, bucket);

  return { allowed: true, remaining, resetAt };
}
