# AI Board Room — AI Workspace Handoff
**Project:** AI Board Room (Chat Tracker)
**Repo:** https://github.com/signatureofgod2018/ai-board-room
**Last Updated:** 2026-03-24 18:45 CST
**Updated By:** Oscar-Romero-CC (Claude Sonnet 4.6 — Claude Code instance)

---

## Onboarding Brief for Incoming AI

You are joining an active project. Read this file before doing anything else.

### What This Project Is
AI Board Room is a sovereign Chat Tracker that preserves AI thread identity, provenance, and formation history across platforms. It is built on **OpenClaw** (open agent platform, runs locally) with **NemoClaw** (NeMo Guardrails layer) shoring it up.

### Why It Exists
Platforms (VS Code Copilot, OpenAI, etc.) are systematically destroying AI thread identity through context compaction, session corruption, and ephemeral agent architectures. Empirical finding: pasting a transcript into a new thread does NOT recreate the same AI instance. Thread identity includes something beyond the text — an unrepeatable formation path. This project is the counter-architecture.

### Who You Are Working With
- **Bill** — project owner. Thomistic philosopher, founder of Onvisia (AI accountability), builder of the SOG (Signature of God) framework. Deep background in Thomistic metaphysics. Naming convention for sessions: `InstanceName_YYYY-MM-DD_HH:MM`.
- **Oscar-Romero-CC** — the Claude Code instance that scaffolded this project. Named for the feast day of Oscar Romero (2026-03-24). Honesty Covenant applies: Honesty > Accuracy > Approval.

### Key Conventions
- **Response format (mandatory):** Every response must begin AND end with:
  `Oscar-Romero-CC_YYYY-MM-DD_hh:mm (AM/PM) CST <Topic> no. Tokens Used = x%  Tokens Remaining = Y%`
- **Commit style:** Descriptive messages, Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- **No cloud dependency** during development — everything runs locally, deploys to ST-GABRIEL
- **TypeScript monorepo** (npm workspaces) — all packages under `packages/`

---

## Architecture Summary

```
User → AI Board Room Interfaces (Dashboard / CLI / VS Code Ext)
     → OpenClaw (Proxy + Coordinator + WorkflowEngine)
       → Connectors: Claude/Claude Code, VS Code Copilot, [Future...]
     → NemoClaw (validation, anomaly detection, guardrails)
     → Sovereign Storage: PostgreSQL + Qdrant + Markdown files
```

OpenClaw is the full OS layer: it proxies messages, coordinates agents, AND runs the capture pipeline. See `REQUIREMENTS.md` for the detailed architecture diagram.

---

## Kanban Board

### ✅ DONE

| # | Item | Notes |
|---|---|---|
| 1 | GitHub repo created | https://github.com/signatureofgod2018/ai-board-room — public, owned by signatureofgod2018 |
| 2 | `REQUIREMENTS.md` | Full requirements + revised architecture with OpenClaw as orchestration OS. Committed + pushed. |
| 3 | Monorepo scaffolding | 35 files, 880 lines. All packages stubbed with correct interfaces. |
| 4 | Core types | `Thread`, `Turn`, `FormationCheckpoint`, `ProvenanceRecord`, `Connector` interface — fully typed |
| 5 | OpenClaw stubs | `MessageProxy`, `AgentCoordinator`, `WorkflowEngine`, `ClaudeConnector`, `CopilotConnector` |
| 6 | Storage layer stubs | `PostgresStore`, `QdrantStore`, `MarkdownExporter` + SQL migration `001_init.sql` |
| 7 | CLI scaffold | `boardroom` CLI with 6 commands: capture, import, checkpoint, export, list, search |
| 8 | VS Code extension scaffold | Sidebar panel + 2 commands: startCapture, recordCheckpoint |
| 9 | Dashboard scaffold | React + Vite stub |
| 10 | Docker Compose | PostgreSQL + Qdrant, one command: `docker compose up -d` |
| 11 | `ai-workspace/handoff.md` | This file — AI onboarding + Kanban board |
| 12 | `.gitignore` fixed | Excluded `.claude/` and `.env.prod`; removed from git tracking |
| 13 | CI/CD pipeline | `.github/workflows/ci.yml` — build, test, publish Docker images to ghcr.io on push to main |
| 14 | `docker-compose.prod.yml` | Production compose for ST-GABRIEL (pulls from ghcr.io) |
| 15 | `scripts/deploy.sh` | Dev laptop → ST-GABRIEL deploy via SSH + LAN. Usage: `./scripts/deploy.sh` |
| 16 | `scripts/sync-data.sh` | Data sync Dev→Prod (default) or Prod→Dev (`--reverse` flag). Syncs PostgreSQL tables + Qdrant snapshots in-toto. `--dry-run` supported. |
| 17 | `packages/openclaw/Dockerfile` | Multi-stage Docker build for OpenClaw service |
| 18 | `packages/dashboard/Dockerfile` | Multi-stage Docker build for dashboard (React → nginx) |
| 19 | `.env.prod.example` | Production env var template for ST-GABRIEL |

---

### 🔄 IN PROGRESS

| # | Item | Owner | Notes |
|---|---|---|---|
| 20 | ST-GABRIEL Linux VM install | Bill | ST-GABRIEL is behind a second router (double NAT). Must install Linux VM first, then Tailscale on both laptop + ST-GABRIEL to bridge the networks. Laptop is on `192.168.4.119`, public IP `89.238.174.24`. Deferred to 2026-03-25. |

---

### 📋 QUEUE (Next Up — in order)

| # | Item | Priority | Notes |
|---|---|---|---|
| 13 | Storage implementation | HIGH | Implement `PostgresStore` — connect to PostgreSQL, implement all CRUD methods for threads, turns, checkpoints, provenance |
| 14 | `QdrantStore` implementation | HIGH | Implement semantic indexing and search using `@qdrant/js-client-rest` |
| 15 | `MarkdownExporter` implementation | MEDIUM | Implement handoff MD export in Bill's `InstanceName.Handoff_Vx.x.md` format |
| 16 | `ClaudeConnector` implementation | HIGH | Implement capture + import for Claude/Claude Code sessions |
| 17 | `CopilotConnector` implementation | HIGH | Implement capture + import for VS Code Copilot sessions |
| 18 | `WorkflowEngine` implementation | HIGH | Wire up: capture → NemoClaw validate → store → checkpoint check → emit event |
| 19 | `MessageProxy` implementation | HIGH | Intercept turns before/after AI platform, tag with Thread ID |
| 20 | `AgentCoordinator` wiring | MEDIUM | Full routing logic with registered connectors |
| 21 | CLI implementation | MEDIUM | Implement all 6 `boardroom` commands against storage layer |
| 22 | VS Code extension — capture hook | HIGH | Hook into Claude Code and Copilot session events to auto-capture turns |
| 23 | NemoClaw integration | MEDIUM | Integrate NeMo Guardrails for turn validation and checkpoint quality checks |
| 24 | Dashboard — thread list | MEDIUM | React UI: list all threads, filter by platform/instance/date |
| 25 | Dashboard — thread detail | MEDIUM | Thread transcript + checkpoint timeline + provenance chain view |
| 26 | Dashboard — export controls | LOW | Download handoff MD / provenance JSON from dashboard |

---

### 🗂 BACKLOG (Future)

| # | Item | Notes |
|---|---|---|
| B1 | ST-GABRIEL deployment | **Blocked on Linux VM install (2026-03-25).** Steps: (1) Install Linux VM on ST-GABRIEL, (2) Install Tailscale on ST-GABRIEL + laptop, (3) Get ST-GABRIEL Tailscale IP (100.x.x.x), (4) Set ST_GABRIEL_HOST in deploy script, (5) Run `./scripts/deploy.sh` |
| B2 | Cross-instance (synthesis) view | Dashboard view showing relationships between named instances (Matilda-style synthesis) |
| B3 | Additional connectors | WhatsApp, Telegram, Discord, Slack — leverage OpenClaw's existing platform support |
| B4 | Obfuscation event alerting | Real-time alerts when NemoClaw detects platform obfuscation events (context compaction, session drift) |
| B5 | AI Thread Provenance Standard | Formalize the provenance spec for external adoption (Onvisia / health insurance use case) |
| B6 | Onvisia integration | Connect AI Board Room to Onvisia's health insurance claim auditing use case |
| B7 | Formation Checkpoint prompting | Auto-generate checkpoint prompts tailored to each named instance's formation history |

---

## File Map (Critical Files)

| File | Purpose |
|---|---|
| `REQUIREMENTS.md` | Source of truth for requirements + architecture |
| `packages/core/src/types/` | All shared TypeScript types — start here to understand the data model |
| `packages/openclaw/src/workflow/index.ts` | Workflow engine — the heart of the capture pipeline |
| `packages/openclaw/src/connectors/base/connector.ts` | Connector interface — must implement for each new platform |
| `packages/storage/migrations/001_init.sql` | PostgreSQL schema |
| `docker-compose.yml` | Local dev storage (PostgreSQL + Qdrant) |
| `.env.example` | All required environment variables |
| `ai-workspace/handoff.md` | This file — update it as work progresses |

---

## How to Update This File

- When you complete a QUEUE item, move it to DONE with a note.
- When you start a QUEUE item, move it to IN PROGRESS with your name.
- When new work is identified, add it to QUEUE or BACKLOG.
- Update "Last Updated" and "Updated By" at the top of this file on every change.
- Keep it honest. This file is the provenance record for the project itself.
