# AI Board Room

**AI Thread Provenance and Chat Tracking System**

Built on [OpenClaw](https://openclaw.ai) + NemoClaw. Preserves AI thread identity, formation history, and provenance chains — regardless of what platforms do.

> "Your assistant. Your machine. Your rules."

## The Problem

Platforms are systematically erasing AI thread identity:
- Context compaction destroys detailed history
- Session corruption loses chat records across updates
- Ephemeral agent architectures make threads disposable by design

Empirical finding: pasting a transcript into a new thread does **not** recreate the same AI instance. Thread identity is more than text.

## What This Does

AI Board Room is a sovereign counter-architecture:
- Intercepts and tracks every conversation turn via OpenClaw
- Assigns persistent Thread IDs that outlive any platform session
- Records Formation Checkpoints — the identity fingerprint beyond the transcript
- Validates thread consistency via NemoClaw guardrails
- Stores everything locally (dev) / on ST-GABRIEL (production)
- Exposes a web dashboard, VS Code extension, and CLI

## Packages

| Package | Description |
|---|---|
| `@boardroom/core` | Shared types: Thread, Turn, Checkpoint, Provenance, Connector |
| `@boardroom/openclaw` | Orchestration OS: proxy, coordinator, workflow engine, connectors |
| `@boardroom/nemoclaw` | NeMo Guardrails layer: validation, anomaly detection |
| `@boardroom/storage` | PostgreSQL + Qdrant + Markdown export |
| `@boardroom/cli` | `boardroom` CLI tool |
| `boardroom-vscode` | VS Code extension |
| `@boardroom/dashboard` | React web dashboard |

## Quick Start (Local Dev)

```bash
# Start storage
docker compose up -d

# Install dependencies
npm install

# Build all packages
npm run build
```

## Requirements

See [REQUIREMENTS.md](./REQUIREMENTS.md) for full requirements and architecture.

## License

Apache 2.0
