# Basilica — Test Plan

**Version:** 0.1
**Date:** 2026-03-24
**Status:** Living Document

---

## 1. Testing Strategy

### 1.1 Test Tiers

| Tier | Suite | When It Runs | Purpose |
|---|---|---|---|
| **T0** | Platform Tests | Before `docker compose up`, before any test suite | Verify infrastructure prerequisites are met |
| **T1** | Unit Tests | Every commit | Verify individual functions in isolation |
| **T2** | Functional Tests | Every commit (CI) | Verify each critical use case end-to-end |
| **T3** | Regression Suite | Pre-push git hook + CI on PR to main | Chain all P0/P1 use cases; catch regressions |

### 1.2 Test Runner

**Vitest** — TypeScript-native, ESM-compatible, fast, built for monorepos.

```bash
npm run test              # run all (unit + functional)
npm run test:platform     # T0 platform smoke tests only
npm run test:functional   # T2 functional tests only
npm run test:regression   # T3 full regression chain
npm run test:watch        # interactive watch mode (dev)
npm run test:coverage     # coverage report
```

### 1.3 Test Database

Functional and regression tests run against a **dedicated test PostgreSQL database** (`basilica_test`) — never the dev or prod database. The test helpers spin it up fresh before each suite and tear it down after.

Qdrant uses a dedicated test collection prefix: `test_*`.

### 1.4 Mock Strategy

| Component | Strategy |
|---|---|
| AI Platform (Claude, Copilot) | `MockConnector` — returns deterministic responses, no real API calls |
| NemoClaw | Stub returning configurable pass/fail — no real NeMo calls in unit/functional |
| PostgreSQL | Real test database (Docker) |
| Qdrant | Real test instance (Docker) |
| File system | `tmp` directory, cleaned up after each test |

---

## 2. Platform Tests (T0) — Pre-Flight Checklist

Run these **before starting platform services** and **before any other test suite**.

### 2.1 Environment Test
File: `tests/platform/environment.test.ts`
- All required env vars are set (POSTGRES_URL, QDRANT_URL, etc.)
- Node.js version >= 20
- npm workspaces functional
- All packages built (dist/ directories exist)

### 2.2 PostgreSQL Test
File: `tests/platform/postgres.test.ts`
- TCP connection to POSTGRES_URL succeeds
- Authentication succeeds
- Required database exists (`basilica` / `basilica_test`)
- Schema version matches expected (all migrations applied)
- Can perform basic CRUD (INSERT → SELECT → DELETE)

### 2.3 Qdrant Test
File: `tests/platform/qdrant.test.ts`
- HTTP connection to QDRANT_URL succeeds (`/healthz` returns 200)
- Can create a test collection
- Can upsert a test vector
- Can search by vector similarity
- Can delete the test collection

### 2.4 Docker Test
File: `tests/platform/docker.test.ts`
- `docker` CLI is available
- `docker compose ps` shows postgres and qdrant containers as `healthy`
- No port conflicts on 5432, 6333, 3000, 4000

---

## 3. Functional Tests (T2) — Critical Use Cases

One test file per use case. Each file is independently runnable.

### UC-01 / UC-02 — Live Session Capture
File: `tests/functional/uc-01-live-capture.test.ts`
- [ ] MockConnector registers with AgentCoordinator
- [ ] `capture()` creates a Thread with correct platform + model metadata
- [ ] Outbound turn is intercepted and tagged with Thread ID + timestamp
- [ ] Inbound turn is intercepted and tagged
- [ ] Turn is persisted to PostgreSQL
- [ ] Turn is indexed in Qdrant
- [ ] ProvenanceRecord is created for the turn
- [ ] WorkflowEngine emits TurnCapturedEvent

### UC-03 — Import Transcript
File: `tests/functional/uc-03-import-transcript.test.ts`
- [ ] `import()` parses a raw transcript into correct number of Turns
- [ ] Each Turn has correct role (user/assistant), content, timestamp
- [ ] Thread is created with correct metadata (platform, model, instanceName)
- [ ] All Turns persisted to PostgreSQL in correct order
- [ ] Thread indexed in Qdrant
- [ ] Full provenance chain generated (one record per turn)

### UC-04 — Formation Checkpoint
File: `tests/functional/uc-04-formation-checkpoint.test.ts`
- [ ] Checkpoint triggered manually produces FormationCheckpoint
- [ ] Checkpoint triggered automatically at N-turn interval
- [ ] Checkpoint contains: voiceStatement, keyDecisions, openQuestions, behavioralCharacteristics
- [ ] NemoClaw validation runs and attaches score + flags
- [ ] Checkpoint persisted to PostgreSQL
- [ ] ProvenanceRecord created: `checkpoint_recorded`
- [ ] Checkpoint linked to correct turnIndex

### UC-05 — Semantic Search
File: `tests/functional/uc-05-semantic-search.test.ts`
- [ ] Query returns ranked list of Threads
- [ ] Results are ordered by similarity score (descending)
- [ ] Filtering by platform returns only matching Threads
- [ ] Empty query returns all threads (or top N)
- [ ] Search across threads from multiple platforms works

### UC-06 — Export Handoff Markdown
File: `tests/functional/uc-06-export-handoff.test.ts`
- [ ] Export produces valid Markdown string
- [ ] File follows `InstanceName.Handoff_Vx.x.md` naming convention
- [ ] Output contains: Purpose, Accomplished, Decisions, Open Threads
- [ ] Output contains Formation Checkpoints section
- [ ] Output contains Provenance Chain section
- [ ] Export of thread with no checkpoints still produces valid output

### UC-07 — View Provenance Chain
File: `tests/functional/uc-07-provenance-chain.test.ts`
- [ ] ProvenanceChain includes all expected event types in correct order
- [ ] Chain is exportable as JSON
- [ ] Chain includes cross-references when present

### UC-08 — Cross-Reference Threads
File: `tests/functional/uc-08-cross-reference.test.ts`
- [ ] CrossReference created between two threads
- [ ] Relationship type is recorded (synthesis, continuation, fork, reference)
- [ ] ProvenanceRecord created: `cross_referenced`
- [ ] Both threads' provenance chains reflect the link

### UC-09 — NemoClaw Obfuscation Detection
File: `tests/functional/uc-09-obfuscation-detection.test.ts`
- [ ] Clean turn sequence returns `{detected: false}`
- [ ] Turn sequence with context compaction markers returns `{detected: true}`
- [ ] Detection result creates ProvenanceRecord: `obfuscation_event_detected`
- [ ] Dashboard alert event emitted when obfuscation detected
- [ ] Identity drift detected when thread voice changes abruptly

### UC-13 — Add a New Platform Connector
File: `tests/functional/uc-13-add-connector.test.ts`
- [ ] New connector implementing `BaseConnector` registers successfully
- [ ] `AgentCoordinator.route()` routes to new connector
- [ ] Connector `supports()` check works correctly
- [ ] New connector integrates with WorkflowEngine pipeline

---

## 4. Regression Suite (T3) — Pre-Push Gate

File: `tests/regression/regression-suite.test.ts`

The regression suite chains all P0 and P1 use cases in a single stateful run using one shared test Thread. It simulates a complete Basilica session from start to finish.

### Chain Order

```
[1] Platform smoke → environment + postgres + qdrant healthy
[2] UC-01  Capture: create Thread "TestInstance_2026-03-24"
[3] UC-03  Import: add turns from sample transcript
[4] UC-04  Checkpoint: record Formation Checkpoint at turn 5
[5] UC-09  Obfuscation: inject suspicious turn sequence → verify detection
[6] UC-08  Cross-reference: link to a second test thread
[7] UC-05  Search: verify thread is findable by content
[8] UC-06  Export: generate handoff MD → verify structure
[9] UC-07  Provenance: verify full chain has all expected event types
```

All steps use the same Thread ID. Failure at any step fails the regression.

---

## 5. CI Integration

### GitHub Actions (`.github/workflows/ci.yml`)

The existing CI pipeline already runs `npm run test`. The full test job order:

```yaml
jobs:
  platform-check:    # T0 — requires Docker services
  unit-test:         # T1 — no Docker needed
  functional-test:   # T2 — requires Docker services
  regression:        # T3 — requires Docker services, runs after functional
  build-publish:     # only after all tests pass
```

Docker services (postgres, qdrant) are spun up as GitHub Actions service containers for T0/T2/T3.

### Pre-Push Git Hook

File: `scripts/setup-git-hooks.sh`

Install with: `./scripts/setup-git-hooks.sh`

Runs the regression suite before every `git push`. Blocks the push if any test fails.

---

## 6. Coverage Requirements

| Package | Minimum Coverage |
|---|---|
| `@basilica/core` | 90% — types and utilities |
| `@basilica/openclaw` | 80% — workflow, proxy, coordinator |
| `@basilica/storage` | 85% — all store methods |
| `@basilica/nemoclaw` | 75% — validation logic |
| `@basilica/cli` | 70% — command handlers |

---

## 7. Test Data

All test fixtures live in `tests/fixtures/`:

| File | Contains |
|---|---|
| `sample-transcript.txt` | 20-turn Claude conversation for import tests |
| `sample-thread.ts` | Pre-built Thread object for unit tests |
| `mock-ai-responses.ts` | Deterministic AI responses for MockConnector |
| `obfuscation-sequence.ts` | Turn sequence with simulated context compaction |
