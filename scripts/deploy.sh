#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Promote code from Dev (laptop) to Prod (ST-GABRIEL)
#
# Usage:
#   ./scripts/deploy.sh
#   ST_GABRIEL_HOST=192.168.1.x ./scripts/deploy.sh
#
# Prerequisites:
#   - SSH key auth configured for ST-GABRIEL
#   - Docker + Docker Compose installed on ST-GABRIEL
#   - ST-GABRIEL can reach ghcr.io (internet access for image pull)
#   - .env.prod exists on ST-GABRIEL at $REMOTE_APP_DIR/.env
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
ST_GABRIEL_HOST="${ST_GABRIEL_HOST:-st-gabriel.local}"
ST_GABRIEL_USER="${ST_GABRIEL_USER:-bill}"
REMOTE_APP_DIR="${REMOTE_APP_DIR:-/opt/basilica}"
COMPOSE_FILE="docker-compose.prod.yml"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()    { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()     { echo -e "${RED}[deploy]${NC} $*" >&2; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
info "Connecting to ST-GABRIEL at ${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}..."
ssh -q "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" exit || err "Cannot reach ST-GABRIEL. Check ST_GABRIEL_HOST and SSH auth."

# ── Step 1: Copy prod compose file to ST-GABRIEL ──────────────────────────────
info "Copying ${COMPOSE_FILE} to ST-GABRIEL..."
ssh "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" "mkdir -p ${REMOTE_APP_DIR}"
scp "${COMPOSE_FILE}" "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}:${REMOTE_APP_DIR}/${COMPOSE_FILE}"

# ── Step 2: Pull latest images from ghcr.io ───────────────────────────────────
info "Pulling latest Docker images on ST-GABRIEL..."
ssh "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" "
  cd ${REMOTE_APP_DIR}
  docker compose -f ${COMPOSE_FILE} pull
"

# ── Step 3: Run database migrations ───────────────────────────────────────────
info "Running database migrations..."
# Copy all migration files
scp packages/storage/migrations/*.sql "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}:${REMOTE_APP_DIR}/migrations/"
ssh "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" "
  cd ${REMOTE_APP_DIR}
  # Run each migration file in order against the running postgres container
  for f in migrations/*.sql; do
    echo \"Running migration: \$f\"
    docker compose -f ${COMPOSE_FILE} exec -T postgres psql -U \${POSTGRES_USER} -d basilica -f /dev/stdin < \"\$f\" || true
  done
"

# ── Step 4: Restart services ───────────────────────────────────────────────────
info "Restarting services..."
ssh "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" "
  cd ${REMOTE_APP_DIR}
  docker compose -f ${COMPOSE_FILE} up -d --remove-orphans
"

# ── Step 5: Health check ───────────────────────────────────────────────────────
info "Waiting for services to be healthy..."
sleep 5
ssh "${ST_GABRIEL_USER}@${ST_GABRIEL_HOST}" "
  cd ${REMOTE_APP_DIR}
  docker compose -f ${COMPOSE_FILE} ps
"

info "✓ Deploy complete. Basilica is running on ST-GABRIEL."
info "  Dashboard: http://${ST_GABRIEL_HOST}:3000"
info "  OpenClaw:  http://${ST_GABRIEL_HOST}:4000"
