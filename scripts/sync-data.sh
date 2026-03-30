#!/usr/bin/env bash
# =============================================================================
# sync-data.sh — Sync conversation data between Dev (laptop) and Prod (ST-GABRIEL)
#
# Default:  Dev → Prod  (promote captured threads/vectors to ST-GABRIEL)
# Reverse:  Prod → Dev  (pull prod data back to dev for debugging)
#
# Usage:
#   ./scripts/sync-data.sh                  # Dev → Prod (default)
#   ./scripts/sync-data.sh --reverse        # Prod → Dev (emergency escape hatch)
#   ./scripts/sync-data.sh --dry-run        # Show what would be synced, no changes
#
# What is synced:
#   PostgreSQL:  threads, turns, checkpoints, provenance_records, cross_references,
#                telemetry (schema + data)
#   Qdrant:      full collection snapshots (vectorized documents, in-toto)
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
ST_GABRIEL_HOST="${ST_GABRIEL_HOST:-st-gabriel.local}"
ST_GABRIEL_USER="${ST_GABRIEL_USER:-bill}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/basilica}"
COMPOSE_FILE="docker-compose.prod.yml"
LOCAL_COMPOSE_FILE="docker-compose.yml"
SYNC_DIR="/tmp/basilica-sync"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── Flags ─────────────────────────────────────────────────────────────────────
REVERSE=false
DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --reverse)  REVERSE=true ;;
    --dry-run)  DRY_RUN=true ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[sync]${NC} $*"; }
warn()    { echo -e "${YELLOW}[sync]${NC} $*"; }
dry()     { echo -e "${CYAN}[dry-run]${NC} $*"; }
err()     { echo -e "${RED}[sync]${NC} $*" >&2; exit 1; }

# ── Direction ─────────────────────────────────────────────────────────────────
if [ "$REVERSE" = true ]; then
  warn "⚠  REVERSE SYNC: Prod (ST-GABRIEL) → Dev (laptop)"
  warn "   This overwrites local dev data. Use only for debugging prod issues."
  read -rp "   Are you sure? (yes/no): " confirm
  [ "$confirm" = "yes" ] || { info "Aborted."; exit 0; }
  SRC_HOST="${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}"
  SRC_COMPOSE="${REMOTE_APP_DIR}/${COMPOSE_FILE}"
  DST_HOST="local"
else
  info "Dev → Prod sync (${ST_GABRIEL_HOST})"
  SRC_HOST="local"
  SRC_COMPOSE="${LOCAL_COMPOSE_FILE}"
  DST_HOST="${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}"
fi

mkdir -p "${SYNC_DIR}"

# ── PostgreSQL Tables to Sync ─────────────────────────────────────────────────
PG_TABLES=(
  "threads"
  "turns"
  "checkpoints"
  "provenance_records"
  "cross_references"
  "telemetry"
)

# ── Helper: run command on source ─────────────────────────────────────────────
run_src() {
  if [ "$SRC_HOST" = "local" ]; then
    eval "$*"
  else
    ssh "${SRC_HOST}" "$*"
  fi
}

run_dst() {
  if [ "$DST_HOST" = "local" ]; then
    eval "$*"
  else
    ssh "${DST_HOST}" "$*"
  fi
}

# ── Step 1: PostgreSQL dump ────────────────────────────────────────────────────
info "Step 1/4 — Dumping PostgreSQL tables..."
DUMP_FILE="${SYNC_DIR}/basilica_${TIMESTAMP}.pgdump"

TABLE_FLAGS=""
for t in "${PG_TABLES[@]}"; do
  TABLE_FLAGS="${TABLE_FLAGS} -t ${t}"
done

if [ "$DRY_RUN" = true ]; then
  dry "Would pg_dump tables: ${PG_TABLES[*]}"
else
  if [ "$SRC_HOST" = "local" ]; then
    docker compose -f "${SRC_COMPOSE}" exec -T postgres \
      pg_dump -U basilica -d basilica --data-only ${TABLE_FLAGS} \
      > "${DUMP_FILE}"
  else
    ssh "${SRC_HOST}" "
      docker compose -f ${SRC_COMPOSE} exec -T postgres \
        pg_dump -U basilica -d basilica --data-only ${TABLE_FLAGS}
    " > "${DUMP_FILE}"
  fi
  info "  Dump written: ${DUMP_FILE} ($(du -sh "${DUMP_FILE}" | cut -f1))"
fi

# ── Step 2: Transfer PostgreSQL dump ──────────────────────────────────────────
info "Step 2/4 — Transferring PostgreSQL dump..."
if [ "$DRY_RUN" = true ]; then
  dry "Would scp ${DUMP_FILE} to destination"
else
  if [ "$DST_HOST" = "local" ]; then
    # Already local — nothing to transfer
    DST_DUMP="${DUMP_FILE}"
  else
    DST_DUMP="/tmp/basilica_${TIMESTAMP}.pgdump"
    scp "${DUMP_FILE}" "${DST_HOST}:${DST_DUMP}"
    info "  Transferred to ${DST_HOST}:${DST_DUMP}"
  fi
fi

# ── Step 3: Restore PostgreSQL dump ───────────────────────────────────────────
info "Step 3/4 — Restoring PostgreSQL on destination..."
if [ "$DRY_RUN" = true ]; then
  dry "Would pg_restore to destination PostgreSQL"
else
  if [ "$DST_HOST" = "local" ]; then
    docker compose -f "${LOCAL_COMPOSE_FILE}" exec -T postgres \
      psql -U basilica -d basilica < "${DUMP_FILE}"
  else
    ssh "${DST_HOST}" "
      cat ${DST_DUMP} | docker compose -f ${REMOTE_APP_DIR}/${COMPOSE_FILE} exec -T postgres \
        psql -U basilica -d basilica
      rm ${DST_DUMP}
    "
  fi
  info "  PostgreSQL restore complete"
fi

# ── Step 4: Qdrant snapshot sync ──────────────────────────────────────────────
info "Step 4/4 — Syncing Qdrant vector collections (in-toto)..."

QDRANT_SRC_URL="http://localhost:6333"
QDRANT_SNAPSHOT_DIR="${SYNC_DIR}/qdrant_${TIMESTAMP}"
mkdir -p "${QDRANT_SNAPSHOT_DIR}"

if [ "$DRY_RUN" = true ]; then
  dry "Would snapshot all Qdrant collections from source and restore to destination"
else
  # Get collection list from source
  if [ "$SRC_HOST" = "local" ]; then
    COLLECTIONS=$(curl -sf "${QDRANT_SRC_URL}/collections" | \
      python3 -c "import sys,json; [print(c['name']) for c in json.load(sys.stdin)['result']['collections']]" 2>/dev/null || echo "")
  else
    COLLECTIONS=$(ssh "${SRC_HOST}" "curl -sf http://localhost:6333/collections" | \
      python3 -c "import sys,json; [print(c['name']) for c in json.load(sys.stdin)['result']['collections']]" 2>/dev/null || echo "")
  fi

  if [ -z "$COLLECTIONS" ]; then
    warn "  No Qdrant collections found on source — skipping vector sync"
  else
    for COLLECTION in $COLLECTIONS; do
      info "  Snapshotting collection: ${COLLECTION}"

      # Create snapshot on source
      if [ "$SRC_HOST" = "local" ]; then
        SNAPSHOT_NAME=$(curl -sf -X POST "${QDRANT_SRC_URL}/collections/${COLLECTION}/snapshots" | \
          python3 -c "import sys,json; print(json.load(sys.stdin)['result']['name'])")
        SNAPSHOT_PATH="${SYNC_DIR}/${COLLECTION}_${TIMESTAMP}.snapshot"
        curl -sf "${QDRANT_SRC_URL}/collections/${COLLECTION}/snapshots/${SNAPSHOT_NAME}" \
          -o "${SNAPSHOT_PATH}"
      else
        SNAPSHOT_NAME=$(ssh "${SRC_HOST}" "curl -sf -X POST http://localhost:6333/collections/${COLLECTION}/snapshots" | \
          python3 -c "import sys,json; print(json.load(sys.stdin)['result']['name'])")
        SNAPSHOT_PATH="${SYNC_DIR}/${COLLECTION}_${TIMESTAMP}.snapshot"
        ssh "${SRC_HOST}" "curl -sf http://localhost:6333/collections/${COLLECTION}/snapshots/${SNAPSHOT_NAME}" \
          > "${SNAPSHOT_PATH}"
      fi

      info "  Snapshot saved: $(du -sh "${SNAPSHOT_PATH}" | cut -f1)"

      # Restore snapshot on destination
      if [ "$DST_HOST" = "local" ]; then
        curl -sf -X POST "http://localhost:6333/collections/${COLLECTION}/snapshots/upload" \
          -H "Content-Type: multipart/form-data" \
          -F "snapshot=@${SNAPSHOT_PATH}" > /dev/null
      else
        DST_SNAPSHOT="/tmp/${COLLECTION}_${TIMESTAMP}.snapshot"
        scp "${SNAPSHOT_PATH}" "${DST_HOST}:${DST_SNAPSHOT}"
        ssh "${DST_HOST}" "
          curl -sf -X POST http://localhost:6333/collections/${COLLECTION}/snapshots/upload \
            -H 'Content-Type: multipart/form-data' \
            -F 'snapshot=@${DST_SNAPSHOT}' > /dev/null
          rm ${DST_SNAPSHOT}
        "
      fi
      info "  ✓ Collection ${COLLECTION} synced"
    done
  fi
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -rf "${SYNC_DIR}"

if [ "$DRY_RUN" = true ]; then
  dry "Dry run complete — no changes made"
else
  DIRECTION=$([ "$REVERSE" = true ] && echo "Prod → Dev" || echo "Dev → Prod")
  info "✓ Data sync complete (${DIRECTION})"
fi
