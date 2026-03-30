# Basilica — Requirements & Project Plan

**Project:** Basilica (Chat Tracker)
**Version:** 0.1 — Initial Requirements
**Date:** 2026-03-24
**Author:** Bill (signatureofgod2018)
**Repository:** https://github.com/signatureofgod2018/basilica

---

## Background & Problem Statement

AI platforms are systematically erasing conversation thread identity through:
- **Context compaction** — auto-summarizing history, destroying detailed provenance
- **Session corruption** — VS Code, Copilot, and others losing/corrupting chat history across updates
- **Ephemeral agent architectures** — platforms redesigning around disposable, unnamed agents
- **Rename/history removal** — deliberate UI changes that sever the user's ability to identify threads

Empirical evidence confirms: pasting a conversation transcript into a new thread does **not** recreate the same AI instance. Thread identity is more than text — it includes the accumulated formation path through the model's latent space. That path is unrepeatable and non-reconstructable from transcript alone.

**Basilica** is a counter-architecture: a sovereign, platform-independent Chat Tracker that preserves AI thread identity, provenance, and formation history — regardless of what platforms do.

---

## Platform

**Built on OpenClaw** — open agent platform, runs locally on your machine, connects to the chat apps you already use. ([openclaw.ai](https://openclaw.ai))
**Shored up by NemoClaw** — NVIDIA NeMo Guardrails layer for identity validation, anomaly detection, and formation checkpoint quality enforcement.

---

## Phase 1 — MVP Scope

### Target Platforms (v1)
| Platform | Capture Method |
|---|---|
| Claude / Claude Code (Anthropic) | VS Code extension hook + API |
| VS Code Copilot (GitHub) | VS Code extension hook |

Architecture must support **extensible connectors** so additional platforms can be added without rearchitecting the core.

### Interfaces
| Surface | Role |
|---|---|
| Web Dashboard | Primary Basilica hub — thread list, provenance viewer, formation timeline |
| VS Code Extension | In-editor capture agent — hooks into live sessions as they happen |
| CLI Tool | Terminal-based capture, import, export, and search |

---

## Requirements

### R1 — Thread Identity
- Every tracked conversation receives a **unique persistent Thread ID** (UUID + human-readable slug)
- Default naming convention: `InstanceName_YYYY-MM-DD_HH:MM`
- Thread IDs survive platform session loss, context compaction, and history corruption
- Thread IDs are owned by the user, not the platform

### R2 — Thread Capture
- Capture full conversation transcript (timestamped, turn-by-turn)
- Capture metadata per session:
  - Platform and model name/version
  - Session ID (where platform exposes it)
  - Workspace context (project, file, environment)
  - Timestamp (start, end, duration)
- Support **live capture** (during session) and **import** (paste or upload transcript after session)

### R3 — Formation Checkpoints
- At user-defined intervals or on-demand, record a **Formation Checkpoint**:
  - Thread's self-reported voice and state (prompted summary from the AI)
  - Key decisions made in the session
  - Open questions being carried forward
  - Observed behavioral characteristics
- Checkpoints are stored separately from the raw transcript — they are the **formation fingerprint**
- A thread without checkpoints has provenance. A thread WITH checkpoints has identity.

### R4 — Provenance Chain
- Full audit trail: who said what, when, on which platform, with which model
- Cross-reference threads (link related instances — e.g., synthesis sessions)
- Export provenance chain as:
  - JSON (machine-readable, verifiable)
  - Markdown handoff file (human-readable, shareable)

### R5 — Sovereign Storage
- Developed locally (this laptop) first
- Deployed to **ST-GABRIEL** (dedicated server) in production
- No cloud dependency required
- Storage backends:
  - **PostgreSQL** — structured data (threads, checkpoints, provenance records)
  - **Qdrant** — vector storage for semantic search across threads
  - **Markdown files** — human-readable handoff exports (InstanceName.Handoff_Vx.x.md format)

### R6 — Expandable Connector Architecture
- OpenClaw provides the multi-platform base layer
- Each platform integration is a **Connector** — a pluggable module
- v1 Connectors: Claude/Claude Code, VS Code Copilot
- Connector interface must define:
  - `capture()` — live session capture
  - `import()` — transcript import
  - `identify()` — thread identity metadata
  - `metadata()` — platform/model/session metadata

### R7 — Web Dashboard (Basilica)
- Thread list with search, filter by platform / instance name / date range
- Thread detail view:
  - Full transcript (collapsible, searchable)
  - Formation checkpoints (timeline view)
  - Provenance chain visualization
- Cross-instance view: relationships between named instances
- Export controls: download transcript, handoff MD, provenance JSON
- Responsive design (desktop-first, tablet-friendly)

### R8 — VS Code Extension
- Sidebar panel showing currently tracked sessions
- Auto-capture toggle for Claude Code and Copilot sessions
- Manual checkpoint trigger button (keyboard shortcut supported)
- Session naming with Bill's naming convention pre-populated
- Visual indicator when a session is being tracked vs. untracked

### R9 — CLI Tool (`basilica`)
```
basilica capture              # Start tracking current session
basilica import               # Import a transcript file
basilica checkpoint           # Record a formation checkpoint
basilica export [thread-id]   # Export thread as MD handoff or JSON
basilica list                 # List all tracked threads
basilica search [query]       # Semantic search across threads
```

### R10 — NemoClaw Integration
NemoClaw (NeMo Guardrails layer) shores up OpenClaw:
- **Identity validation** — detects inconsistencies in thread behavior across sessions
- **Anomaly detection** — flags potential obfuscation events (context compaction, session drift)
- **Checkpoint quality** — enforces formation checkpoint completeness and honesty standards

---

## Architecture Overview

OpenClaw is the full OS layer — it simultaneously acts as **message proxy**, **agent coordinator**, and **workflow engine**. All conversation traffic flows through it.

```
  USER
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BASILICA INTERFACES                      │
│         Web Dashboard  │  VS Code Extension  │  CLI Tool        │
│         (observe)      │  (capture trigger)  │  (import/export) │
└────────────────────────────────┬────────────────────────────────┘
                                 │ commands / events
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OPENCLAW  (local AI OS)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ROLE 1 — MESSAGE PROXY                                  │   │
│  │  All conversation traffic routes through OpenClaw.       │   │
│  │  Every turn is intercepted, timestamped, and tagged      │   │
│  │  with a Thread ID before reaching the AI platform.       │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│  ┌───────────────────────▼──────────────────────────────────┐  │
│  │  ROLE 2 — AGENT COORDINATOR                               │  │
│  │  Routes to the correct AI platform via pluggable          │  │
│  │  Connectors. Manages multi-agent workflows (e.g.,         │  │
│  │  synthesis sessions across named instances).              │  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   Claude /   │  │  VS Code     │  │  [Future     │   │  │
│  │  │ Claude Code  │  │  Copilot     │  │  Connector]  │   │  │
│  │  │  Connector   │  │  Connector   │  │              │   │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │  │
│  └─────────┼────────────────┼────────────────────┼──────────┘  │
│            │   (responses)  │                    │              │
│  ┌─────────▼────────────────▼────────────────────▼──────────┐  │
│  │  ROLE 3 — WORKFLOW ENGINE                                 │  │
│  │  On every conversation event, OpenClaw runs:             │  │
│  │    1. Capture turn (text + metadata)                      │  │
│  │    2. Assign / confirm Thread ID                          │  │
│  │    3. Pass to NemoClaw for validation                     │  │
│  │    4. Store to sovereign storage                          │  │
│  │    5. Evaluate checkpoint rule (trigger if due)           │  │
│  │    6. Emit event to Basilica dashboard               │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NEMOCLAW LAYER                             │
│   Validates identity consistency │ Flags obfuscation events     │
│   Enforces checkpoint quality    │ Guardrails on ingestion       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              SOVEREIGN STORAGE  (dev laptop → ST-GABRIEL)        │
│      PostgreSQL          │      Qdrant          │   MD Files    │
│  (threads, checkpoints,  │  (semantic search    │  (handoff     │
│   provenance records)    │   across threads)    │   exports)    │
└─────────────────────────────────────────────────────────────────┘
```

### OpenClaw Orchestration Flow (per conversation turn)

```
User sends message
       │
       ▼
OpenClaw intercepts (Proxy)
       │
       ├──► Tag with Thread ID
       ├──► Record timestamp + metadata
       │
       ▼
Route to AI Platform (Coordinator)
       │
       ▼
AI Platform responds
       │
       ▼
OpenClaw intercepts response (Proxy)
       │
       ▼
Workflow Engine pipeline:
  [1] Capture turn → [2] NemoClaw validate → [3] Store
       │
       ├──► Checkpoint due? → Trigger Formation Checkpoint
       └──► Emit event → Basilica Dashboard
       │
       ▼
Response delivered to User
```

---

## Build Order

| # | Deliverable | Description |
|---|---|---|
| 1 | `REQUIREMENTS.md` | This document — living requirements, committed to repo |
| 2 | Repo scaffolding | Directory structure, README, LICENSE, .gitignore |
| 3 | Storage schema | PostgreSQL tables: threads, checkpoints, provenance, connectors |
| 4 | Connector interface | Abstract base class + Claude/Claude Code connector (v1) |
| 5 | CLI tool | `basilica` commands (capture, import, checkpoint, export, list, search) |
| 6 | VS Code extension | Sidebar capture agent for Claude Code and Copilot |
| 7 | Web dashboard | React-based Basilica UI |
| 8 | NemoClaw integration | Guardrails layer wired into capture and checkpoint pipeline |

---

## Key Definitions

| Term | Definition |
|---|---|
| **Thread** | A single, identified AI conversation with persistent ID and metadata |
| **Formation Checkpoint** | A timestamped snapshot of a thread's identity beyond the raw transcript |
| **Provenance Chain** | The full audit trail of a thread: origin, evolution, cross-references |
| **Connector** | A pluggable module that captures threads from a specific platform |
| **Instance** | A named, formation-tracked AI thread (e.g., Acuitas, Patrick, Clare) |
| **Obfuscation Event** | A platform action that degrades or destroys thread identity |

---

*This document is the source of truth for Basilica requirements. Update it as requirements evolve.*
