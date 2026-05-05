import {
  A2A_CANONICAL_AGENT_CARD_PATH,
  A2A_COMPAT_AGENT_CARD_PATH,
} from "./types";

export type A2aOperatingProfile =
  | "local-dev"
  | "single-host"
  | "private-network"
  | "cloud-https"
  | "custom";

export interface A2aConfig {
  profile: A2aOperatingProfile;
  publicBaseUrl: string;
  endpointBaseUrl: string;
  canonicalCardPath: typeof A2A_CANONICAL_AGENT_CARD_PATH;
  compatCardPath: typeof A2A_COMPAT_AGENT_CARD_PATH;
  remoteCardTimeoutMs: number;
  allowPrivateNetworkCards: boolean;
  adkFixtureCardUrl: string;
}

const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";
const DEFAULT_ADK_FIXTURE_CARD_URL =
  "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json";
const OPERATING_PROFILES: A2aOperatingProfile[] = [
  "local-dev",
  "single-host",
  "private-network",
  "cloud-https",
  "custom",
];

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  return raw.replace(/\/+$/, "");
}

function parseProfile(value: string | undefined): A2aOperatingProfile {
  if (value && OPERATING_PROFILES.includes(value as A2aOperatingProfile)) {
    return value as A2aOperatingProfile;
  }
  return "local-dev";
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getA2aConfig(): A2aConfig {
  const publicBaseUrl = normalizeBaseUrl(
    process.env.KITCHEN_PUBLIC_BASE_URL,
    DEFAULT_PUBLIC_BASE_URL
  );

  return {
    profile: parseProfile(process.env.KITCHEN_A2A_PROFILE),
    publicBaseUrl,
    endpointBaseUrl: normalizeBaseUrl(
      process.env.KITCHEN_A2A_ENDPOINT_BASE_URL,
      publicBaseUrl
    ),
    canonicalCardPath: A2A_CANONICAL_AGENT_CARD_PATH,
    compatCardPath: A2A_COMPAT_AGENT_CARD_PATH,
    remoteCardTimeoutMs: parseTimeout(process.env.KITCHEN_A2A_REMOTE_CARD_TIMEOUT_MS),
    allowPrivateNetworkCards: parseBoolean(
      process.env.KITCHEN_A2A_ALLOW_PRIVATE_NETWORK_CARDS,
      true
    ),
    adkFixtureCardUrl:
      process.env.KITCHEN_A2A_ADK_FIXTURE_CARD_URL?.trim() || DEFAULT_ADK_FIXTURE_CARD_URL,
  };
}
