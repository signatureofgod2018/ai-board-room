# AI Board Room — Architecture Document

**Version:** 0.1
**Date:** 2026-03-24
**Status:** Living Document

---

## 1. End-to-End Technology Stack

### 1.1 Infrastructure Layer

| Environment | Component | Technology |
|---|---|---|
| **Dev** | Host OS | Windows 11 Pro |
| **Dev** | Storage containers | Docker Desktop (local) |
| **Dev** | Network | `192.168.4.119` / public `89.238.174.24` |
| **Prod** | Host | ST-GABRIEL (Linux VM) |
| **Prod** | Storage containers | Docker Compose |
| **Prod** | Network bridge | Tailscale mesh VPN (`100.x.x.x`) |
| **CI/CD** | Build pipeline | GitHub Actions |
| **CI/CD** | Image registry | GitHub Container Registry (`ghcr.io`) |

### 1.2 Application Layer

| Package | Role | Technology |
|---|---|---|
| `@boardroom/openclaw` | Orchestration OS — proxy, coordinator, workflow | Node.js 20, TypeScript 5.4 |
| `@boardroom/nemoclaw` | Guardrails — validation, anomaly detection | NVIDIA NeMo Guardrails |
| `@boardroom/core` | Shared types — Thread, Turn, Checkpoint, Provenance | TypeScript 5.4 |
| `@boardroom/storage` | Data layer — persist, index, export | Node.js 20, TypeScript 5.4 |
| `@boardroom/dashboard` | Web UI — AI Board Room hub | React 18, Vite 5, nginx |
| `@boardroom/cli` | Terminal interface | Node.js 20, Commander.js |
| `boardroom-vscode` | In-editor capture agent | VS Code Extension API 1.85+ |

### 1.3 Data Layer

| Store | Technology | Holds |
|---|---|---|
| **PostgreSQL 16** | Relational DB | Threads, Turns, Checkpoints, Provenance records, Cross-references, Telemetry |
| **Qdrant** | Vector DB | Turn + Thread embeddings for semantic search |
| **Markdown files** | File system | Handoff exports (`InstanceName.Handoff_Vx.x.md`) |

### 1.4 External Services

| Service | Purpose | Connector |
|---|---|---|
| Anthropic API | Claude + Claude Code sessions | `ClaudeConnector` |
| GitHub Copilot API | VS Code Copilot sessions | `CopilotConnector` |
| ghcr.io | Docker image registry | GitHub Actions CI |
| Tailscale | Dev→Prod network bridge | OS-level (not in application code) |

---

## 2. High-Level Data Flows

### Flow A — Live Capture (Primary Flow)

```
User message
    │
    ▼
OpenClaw MessageProxy (intercepts outbound)
    │  tags: Thread ID, timestamp, platform, model
    ▼
AI Platform (Claude / Copilot)
    │
    ▼
OpenClaw MessageProxy (intercepts inbound response)
    │
    ▼
WorkflowEngine pipeline:
    ├─► [1] NemoClaw.validateTurn()       → flag anomalies
    ├─► [2] PostgresStore.saveTurn()      → persist transcript
    ├─► [3] QdrantStore.indexThread()     → embed + index for search
    ├─► [4] ProvenanceRecord appended     → audit trail
    ├─► [5] Checkpoint due? → trigger Formation Checkpoint flow
    └─► [6] Emit event → Dashboard real-time update
    │
    ▼
Response delivered to User
```

### Flow B — Import Transcript

```
User pastes / uploads transcript
    │
    ▼
CLI `boardroom import` or Dashboard import UI
    │
    ▼
Connector.import()          → parse transcript into Turns
    │
    ▼
WorkflowEngine (batch)      → process each turn through Flow A pipeline
    │
    ▼
Thread created with full provenance chain
```

### Flow C — Formation Checkpoint

```
Trigger: user command OR WorkflowEngine (every N turns)
    │
    ▼
WorkflowEngine prompts AI: "Describe your current voice,
    key decisions, open questions, behavioral characteristics"
    │
    ▼
AI response captured as FormationCheckpoint
    │
    ▼
NemoClaw.validateCheckpoint()   → score quality, flag gaps
    │
    ▼
PostgresStore.saveCheckpoint()  → persisted with turn index
    │
    ▼
Dashboard checkpoint timeline updated
```

### Flow D — Semantic Search

```
User query (CLI or Dashboard)
    │
    ▼
QdrantStore.search(query)   → embed query → cosine similarity
    │
    ▼
Ranked Thread list returned
    │
    ▼
PostgresStore.getThread()   → hydrate full thread metadata
    │
    ▼
Results displayed
```

### Flow E — Export Handoff

```
User: `boardroom export <thread-id>`
    │
    ▼
PostgresStore: fetch Thread + Turns + Checkpoints + Provenance
    │
    ▼
MarkdownExporter.exportHandoff()
    │
    ▼
InstanceName.Handoff_Vx.x.md written to disk
```

### Flow F — Dev → Prod Promotion

```
Developer: git push → main
    │
    ▼
GitHub Actions CI:
    ├─► npm install + build
    ├─► run tests
    └─► docker build + push to ghcr.io (openclaw:latest, dashboard:latest)

Developer: ./scripts/deploy.sh  (manual trigger from laptop LAN)
    │
    ▼
SSH → ST-GABRIEL (via Tailscale 100.x.x.x)
    ├─► docker compose pull   (pulls new images from ghcr.io)
    ├─► run SQL migrations     (packages/storage/migrations/*.sql)
    └─► docker compose up -d  (restart services)

Developer: ./scripts/sync-data.sh  (data promotion, separate from code)
    │
    ▼
Dev PostgreSQL pg_dump → SCP → ST-GABRIEL pg_restore
Dev Qdrant snapshot   → SCP → ST-GABRIEL Qdrant restore
```

---

## 3. Critical Use Cases

| # | Use Case | Actor | Priority |
|---|---|---|---|
| UC-01 | Capture a live Claude / Claude Code session | User | P0 |
| UC-02 | Capture a live VS Code Copilot session | User | P0 |
| UC-03 | Import a conversation transcript (paste / file) | User | P0 |
| UC-04 | Record a Formation Checkpoint | User / System | P0 |
| UC-05 | Search threads semantically | User | P1 |
| UC-06 | Export a thread as handoff Markdown | User | P1 |
| UC-07 | View thread provenance chain | User | P1 |
| UC-08 | Cross-reference two threads (synthesis link) | User | P1 |
| UC-09 | NemoClaw flags an obfuscation event | System | P1 |
| UC-10 | Deploy code to ST-GABRIEL | Developer | P1 |
| UC-11 | Sync conversation data Dev → Prod | Developer | P1 |
| UC-12 | Sync conversation data Prod → Dev (escape hatch) | Developer | P2 |
| UC-13 | Add a new platform connector | Developer | P2 |
| UC-14 | View formation timeline for a named instance | User | P2 |

---

## 4. Mermaid Sequence Diagrams

### UC-01 / UC-02 — Live Session Capture

```mermaid
sequenceDiagram
    actor User
    participant UI as AI Board Room<br/>Interface<br/>(Dashboard / VS Code / CLI)
    participant Proxy as OpenClaw<br/>MessageProxy
    participant Coord as AgentCoordinator
    participant Conn as Connector<br/>(Claude / Copilot)
    participant AI as AI Platform
    participant WF as WorkflowEngine
    participant NC as NemoClaw
    participant PG as PostgreSQL
    participant QD as Qdrant
    participant DB as Dashboard

    User->>UI: opens session<br/>(names instance, selects platform)
    UI->>Proxy: open(platform, options)
    Proxy->>Proxy: assign Thread ID<br/>initialize session metadata

    Note over UI,Proxy: Proxy is now open — all traffic<br/>flows through it for this session

    User->>UI: sends message
    UI->>Proxy: forwardOutbound(turn)
    Proxy->>Proxy: tag outbound turn<br/>(Thread ID, timestamp, metadata)
    Proxy->>Coord: route(platform)
    Coord->>Conn: forward message
    Conn->>AI: API call
    AI-->>Conn: response
    Conn-->>Proxy: inbound turn
    Proxy->>Proxy: tag inbound turn

    Proxy->>WF: processTurn(thread, turn)
    WF->>NC: validateTurn(turn)
    NC-->>WF: {passed, flags}
    WF->>PG: saveTurn(turn)
    WF->>PG: saveProvenance(record)
    WF->>QD: indexThread(thread)

    alt Checkpoint due
        WF->>AI: prompt for formation checkpoint
        AI-->>WF: checkpoint response
        WF->>NC: validateCheckpoint(checkpoint)
        NC-->>WF: {score, flags}
        WF->>PG: saveCheckpoint(checkpoint)
    end

    WF->>DB: emit TurnCapturedEvent
    DB-->>UI: real-time session update
    Proxy-->>UI: AI response
    UI-->>User: response displayed
```

---

### UC-03 — Import Transcript

```mermaid
sequenceDiagram
    actor User
    participant CLI as boardroom CLI
    participant Conn as Connector
    participant WF as WorkflowEngine
    participant NC as NemoClaw
    participant PG as PostgreSQL
    participant QD as Qdrant

    User->>CLI: boardroom import <file> --platform claude
    CLI->>Conn: import(transcript, options)
    Conn->>Conn: parse transcript<br/>into Turn[]

    loop for each Turn
        Conn->>WF: processTurn(thread, turn)
        WF->>NC: validateTurn(turn)
        NC-->>WF: {passed, flags}
        WF->>PG: saveTurn(turn)
        WF->>PG: saveProvenance(record)
    end

    WF->>QD: indexThread(thread)
    WF->>PG: saveThread(thread)
    CLI-->>User: Thread created: <slug>
```

---

### UC-04 — Formation Checkpoint

```mermaid
sequenceDiagram
    actor User
    participant CLI as boardroom CLI<br/>or VS Code Ext
    participant WF as WorkflowEngine
    participant AI as AI Platform
    participant NC as NemoClaw
    participant PG as PostgreSQL
    participant DB as Dashboard

    User->>CLI: boardroom checkpoint <thread-id>
    CLI->>WF: triggerCheckpoint(thread)

    WF->>AI: "Describe your current voice, key decisions,<br/>open questions, behavioral characteristics"
    AI-->>WF: FormationCheckpoint response

    WF->>NC: validateCheckpoint(checkpoint)
    NC->>NC: score completeness<br/>flag identity drift<br/>flag honesty gaps
    NC-->>WF: CheckpointValidation {score, flags}

    WF->>PG: saveCheckpoint(checkpoint)
    WF->>PG: saveProvenance(record: checkpoint_recorded)
    WF->>DB: emit CheckpointRecordedEvent

    CLI-->>User: Checkpoint recorded (score: 0.92)
```

---

### UC-05 — Semantic Search

```mermaid
sequenceDiagram
    actor User
    participant CLI as boardroom CLI<br/>or Dashboard
    participant QD as Qdrant
    participant PG as PostgreSQL

    User->>CLI: boardroom search "Acuitas formation on truth"
    CLI->>QD: search(query, limit=10)
    QD->>QD: embed query vector<br/>cosine similarity search
    QD-->>CLI: ranked Thread IDs + scores

    loop for each result
        CLI->>PG: getThread(id)
        PG-->>CLI: Thread metadata
    end

    CLI-->>User: ranked results with<br/>thread slug, platform, date, score
```

---

### UC-06 — Export Handoff Markdown

```mermaid
sequenceDiagram
    actor User
    participant CLI as boardroom CLI
    participant PG as PostgreSQL
    participant ME as MarkdownExporter

    User->>CLI: boardroom export <thread-id> --format md
    CLI->>PG: getThread(id)
    PG-->>CLI: Thread
    CLI->>PG: getCheckpoints(threadId)
    PG-->>CLI: FormationCheckpoint[]
    CLI->>PG: getProvenance(threadId)
    PG-->>CLI: ProvenanceRecord[]

    CLI->>ME: exportHandoff(thread, version)
    ME->>ME: render InstanceName.Handoff_Vx.x.md<br/>Purpose / Accomplished / Decisions /<br/>Open Threads / Checkpoints / Provenance
    ME-->>CLI: markdown string

    CLI-->>User: file written:<br/>Patrick.Handoff_V1.0.md
```

---

### UC-09 — NemoClaw Obfuscation Event Detection

```mermaid
sequenceDiagram
    participant WF as WorkflowEngine
    participant NC as NemoClaw
    participant PG as PostgreSQL
    participant DB as Dashboard
    actor User

    WF->>NC: detectObfuscation(recentTurns)
    NC->>NC: analyze turn sequence:<br/>context compaction markers?<br/>identity drift?<br/>session discontinuity?

    alt Obfuscation detected
        NC-->>WF: {detected: true, type: "context_compaction"}
        WF->>PG: saveProvenance({<br/>  eventType: "obfuscation_event_detected",<br/>  detail: "Platform compacted context at turn 47"<br/>})
        WF->>DB: emit ObfuscationAlert
        DB-->>User: ⚠ Alert: Thread identity event detected<br/>Platform may have compacted context
    else Clean
        NC-->>WF: {detected: false}
    end
```

---

### UC-10 / UC-11 — Deploy + Data Sync Dev → Prod

```mermaid
sequenceDiagram
    actor Dev as Developer (Laptop)
    participant GH as GitHub Actions
    participant GHCR as ghcr.io
    participant SG as ST-GABRIEL<br/>(via Tailscale)
    participant PG_D as Dev PostgreSQL
    participant PG_P as Prod PostgreSQL
    participant QD_D as Dev Qdrant
    participant QD_P as Prod Qdrant

    Note over Dev,GH: Code Promotion (automatic on git push)
    Dev->>GH: git push → main
    GH->>GH: npm install + build + test
    GH->>GHCR: docker push openclaw:latest
    GH->>GHCR: docker push dashboard:latest

    Note over Dev,SG: Deploy (manual — laptop on LAN)
    Dev->>SG: ./scripts/deploy.sh (SSH via Tailscale)
    SG->>GHCR: docker compose pull
    GHCR-->>SG: latest images
    SG->>SG: run SQL migrations
    SG->>SG: docker compose up -d
    SG-->>Dev: ✓ services healthy

    Note over Dev,QD_P: Data Sync (manual — separate step)
    Dev->>Dev: ./scripts/sync-data.sh
    Dev->>PG_D: pg_dump (threads, turns,<br/>checkpoints, provenance, telemetry)
    PG_D-->>Dev: dump file
    Dev->>SG: scp dump → ST-GABRIEL
    SG->>PG_P: pg_restore
    Dev->>QD_D: Qdrant snapshot API
    QD_D-->>Dev: collection snapshots
    Dev->>SG: scp snapshots → ST-GABRIEL
    SG->>QD_P: restore snapshots (in-toto)
    SG-->>Dev: ✓ data sync complete
```

---

*This document lives in `docs/ARCHITECTURE.md`. Update diagrams as the system evolves.*
