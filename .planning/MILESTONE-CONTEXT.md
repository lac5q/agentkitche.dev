---
milestone: v2.0
name: Universal Agent Orchestration
created: 2026-05-04
---

# Milestone v2.0: Universal Agent Orchestration

## Goal

Transform Agent Kitchen from a personal tool into a production-ready open-source hub — universal agent memory, skills, and orchestration in a box, deployable by any developer, compatible with any agent framework.

## Core Insight: A2A-Native

Rather than inventing a custom Kitchen protocol, Kitchen speaks Google's A2A protocol natively. A2A is an open standard for agent interoperability — if Kitchen is an A2A hub, then Google ADK agents, Claude Code agents, LangChain agents, CrewAI agents, AutoGen agents plug in automatically. Non-A2A agents get a thin REST shim.

## Target Features

1. **A2A Hub** — Kitchen exposes `/.well-known/agent.json` agent card, implements A2A task API, enables agent discovery and delegation between agents
2. **Google ADK support** — ADK agents register with Kitchen via A2A; Kitchen surfaces them in Flow diagram
3. **Universal REST API** — Any non-A2A agent can `POST /api/heartbeat`, `/api/skills/report`, `/api/memory/add`, `/api/tool-attention/record` — framework-agnostic, documented
4. **Operating profiles + env-driven config** — Kitchen ships with a sane default install like OpenClaw/Hermes-style local operations, but every topology-specific value is overridable through documented config
5. **Docker full-stack** — `docker-compose up` spins Kitchen + Knowledge MCP + mem0 + Qdrant; works on Mac and Linux
6. **Documentation** — README rewrite with clear value prop, architecture diagram, per-framework integration guides (Claude Code, Google ADK, LangChain, CrewAI), API reference
7. **OSS polish** — MIT license, CONTRIBUTING.md, security policy, issue templates, public CI hardened for open source

## Operating Profile Principle

Kitchen should feel easy to install because the product has a recommended path, not because the code assumes one developer's machine. The default profile should be excellent for local development, while operators can switch to `single-host`, `private-network`, `cloud-https`, or `custom` profiles without forking source. This applies across A2A endpoints, agent cards, service URLs, auth mode, data paths, memory backends, orchestration endpoints, and setup/Docker/docs.

## Proposed Phase Structure (continuing from Phase 33)

- **Phase 34**: Universal REST API + dynamic agent roster (remove all hardcoding, make agent registration dynamic)
- **Phase 35**: A2A protocol support + Google ADK integration
- **Phase 36**: Env config audit + Docker full-stack deployment
- **Phase 37**: Developer setup experience (setup.sh, prereq detection, first-run onboarding)
- **Phase 38**: Documentation + architecture diagrams + per-framework integration guides
- **Phase 39**: OSS polish (MIT license, CONTRIBUTING.md, security policy, issue templates, CI hardening)

## User-Confirmed Decisions

- Distribution: fork + self-host (not SaaS)
- Target: developers (not non-technical users)
- Agent integration: REST API (any framework can POST to Kitchen)
- Dependencies: required (mem0 + Knowledge MCP + Qdrant — not optional)
- Agent framework support: framework-agnostic REST + Google ADK + A2A protocol
- Agent protocol: A2A-native (not a custom Kitchen protocol)
- Operating model: blessed default install plus operator-customizable profiles, not hardcoded Luis-specific topology
- Elegance priority: high — "as elegant as possible"
- Version: v2.0 (direction change — personal tool → open-source product)
