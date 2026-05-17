// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkAuthRateLimit, clearAuthRateLimit } from "../rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  clearAuthRateLimit();
});

describe("auth rate limiting", () => {
  it("allows requests up to the configured limit", () => {
    const req = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(checkAuthRateLimit(req, "login", 2)).toBeNull();
    expect(checkAuthRateLimit(req, "login", 2)).toBeNull();
  });

  it("returns 429 after the configured limit", async () => {
    const req = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    checkAuthRateLimit(req, "login", 1);
    const res = checkAuthRateLimit(req, "login", 1);

    expect(res?.status).toBe(429);
    expect(await res?.json()).toMatchObject({ code: "AUTH_RATE_LIMITED" });
  });

  it("ignores spoofed forwarding headers unless explicitly trusted", async () => {
    const first = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const second = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });

    expect(checkAuthRateLimit(first, "login", 1)).toBeNull();
    expect(checkAuthRateLimit(second, "login", 1)?.status).toBe(429);
  });

  it("uses forwarding headers only behind a trusted proxy", () => {
    vi.stubEnv("AUTH_TRUST_PROXY_HEADERS", "true");

    const first = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const second = new Request("http://localhost/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });

    expect(checkAuthRateLimit(first, "login", 1)).toBeNull();
    expect(checkAuthRateLimit(second, "login", 1)).toBeNull();
  });
});
