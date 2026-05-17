# Contributing to MemroOS

Thanks for helping improve MemroOS. This project is an early operator control plane for agent fleets, A2A delegation, memory routing, and workflow visibility.

## Setup

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Copy or generate environment values from `.env.example`.
4. Run `./setup.sh --wizard` for guided local setup, then `./setup.sh` for checks.
5. Use either Docker Compose for OSS-style full-stack testing or the native workflow for day-to-day development.

Useful commands:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

## Pull Requests

- Use a topic branch with a clear name.
- Keep changes scoped to one behavior or phase.
- Include tests for behavior changes.
- Update docs when setup, APIs, security posture, or operator workflows change.
- Redact secrets and local private URLs from logs, screenshots, and issue comments.

## Contribution License

By submitting a contribution, you agree that it is licensed under the repository license in effect at the time of submission. Current MemroOS contributions are under the PolyForm Small Business License 1.0.0 unless a separate written agreement says otherwise.

Memroos versions up to the `memroos-mit-final` tag remain under the MIT License for copies received under those earlier terms.

## Coding Standards

- Memroos is a Next.js App Router app in `apps/memroos`.
- Read the project Next.js note in `AGENTS.md` before changing framework APIs.
- Prefer TypeScript types, structured parsers, and existing helpers over ad hoc string parsing.
- Do not use `execSync` or `exec`; use safer process APIs or pure filesystem APIs.
- Keep config environment-driven. Do not add Luis-specific paths, ports, hostnames, or secrets.
- Qdrant remains cloud-configured through `QDRANT_URL` and `QDRANT_API_KEY`; do not add a local Qdrant container.

## Agent Integrations

Use A2A when a framework can expose an agent card and task lifecycle. Use the REST shim for agents that only need heartbeat, memory writes, skill reports, or tool outcomes. New integrations should document:

- Registration flow.
- Required environment variables.
- Auth and network assumptions.
- Capabilities reported to the registry.
- Memory and audit behavior.

## Memory Backends

The current memory model is fixed for this release:

- Vector memory: mem0 + Qdrant Cloud.
- Graph memory: Neo4j.
- Episodic memory: Memroos SQLite.

If you change routing rules, update tests and `docs/memory-architecture.md`.

## Verification Checklist

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
./scripts/docker-compose-smoke.sh --config-only
```

If a command cannot run in your environment, include the exact command and reason in the PR.
