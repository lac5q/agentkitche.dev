// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { authorizeRegistryWrite } from "@/lib/operator-auth";

describe("authorizeRegistryWrite", () => {
  afterEach(() => {
    delete process.env.KITCHEN_OPERATOR_API_KEY;
  });

  it("allows loopback registry writes without an operator key", () => {
    expect(authorizeRegistryWrite(new Request("http://localhost/api/agents/register"))).toBe(true);
    expect(authorizeRegistryWrite(new Request("http://127.0.0.1/api/agents/register"))).toBe(true);
  });

  it("does not treat a public forwarded host as local loopback", () => {
    expect(
      authorizeRegistryWrite(
        new Request("http://localhost/api/agents/register", {
          headers: { "x-forwarded-host": "kitchen.example.com" },
        })
      )
    ).toBe(false);
  });

  it("blocks non-local registry writes unless the operator key matches", () => {
    process.env.KITCHEN_OPERATOR_API_KEY = "operator-secret";

    expect(authorizeRegistryWrite(new Request("https://kitchen.example.com/api/agents/register"))).toBe(false);
    expect(
      authorizeRegistryWrite(
        new Request("https://kitchen.example.com/api/agents/register", {
          headers: { "x-kitchen-operator-key": "operator-secret" },
        })
      )
    ).toBe(true);
    expect(
      authorizeRegistryWrite(
        new Request("https://kitchen.example.com/api/agents/register", {
          headers: { authorization: "Bearer operator-secret" },
        })
      )
    ).toBe(true);
  });
});
