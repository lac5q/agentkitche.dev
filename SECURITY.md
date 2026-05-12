# Security Policy

`agentkitchen.dev` is early operator infrastructure for local and self-hosted agent fleets. Security reports are welcome, especially around agent registration, A2A task handling, memory writes, MCP/tool permissions, and secret handling.

## Supported Versions

The active development branch is `main`. Until the project reaches a stable release, security fixes target `main` first.

## Responsible Disclosure

Please report suspected vulnerabilities through GitHub Security Advisories when available, or open a minimal public issue that says a private security report is needed without including exploit details.

Do not include:

- Live API keys, bearer tokens, cookies, SSH keys, or OAuth tokens.
- Private user data, private prompts, medical/legal/financial records, or customer data.
- Exploit payloads against third-party systems.
- Internal network hostnames or tunnels that are not already public.

## In Scope

- A2A auth bypass or task visibility bugs.
- Registry write or onboarding token bypass.
- Per-agent API key leakage.
- Operator key handling issues.
- Prompt/task injection that bypasses Iris or content scanning.
- MCP/tool permission escalation.
- Memory data leakage across agents, tiers, or projects.
- Secret exposure in logs, CI, screenshots, or generated artifacts.

## Current Controls

- Operator-gated registry and onboarding writes.
- Per-agent bearer keys for reporting endpoints.
- Secret guard workflow for repository pushes.
- Content scanner and Iris pre-flight checks on agent-facing task ingress.
- Policy checks for dispatch, A2A send, and memory write paths.
- Environment-driven operating profiles for local, private-network, and HTTPS deployments.

## Safe Reporting Tips

Use synthetic tokens such as `sk-test-redacted` in examples. Include affected route names, expected behavior, actual behavior, and minimal reproduction steps that do not require access to your private infrastructure.
