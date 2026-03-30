#!/usr/bin/env bash
# =============================================================================
# setup-git-hooks.sh — Install git hooks for CI-CD gate enforcement
#
# Run once after cloning:  ./scripts/setup-git-hooks.sh
#
# Hooks installed:
#   pre-push   — runs regression suite before every git push
# =============================================================================

set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}[hooks]${NC} $*"; }

# ── pre-push ──────────────────────────────────────────────────────────────────
PRE_PUSH="${HOOKS_DIR}/pre-push"
cat > "${PRE_PUSH}" <<'HOOK'
#!/usr/bin/env bash
# Basilica — pre-push hook
# Runs regression suite. Blocks push if any test fails.

set -euo pipefail

echo "[pre-push] Running regression suite before push..."
echo "[pre-push] (skip with: git push --no-verify)"
echo ""

cd "$(git rev-parse --show-toplevel)"

# Run platform smoke tests first
echo "[pre-push] Step 1/2 — Platform smoke tests..."
if ! npm run test:platform --silent 2>&1; then
  echo ""
  echo "[pre-push] ✗ Platform tests FAILED — push blocked."
  echo "[pre-push]   Ensure Docker is running: docker compose up -d"
  exit 1
fi

# Run regression suite
echo "[pre-push] Step 2/2 — Regression suite..."
if ! npm run test:regression --silent 2>&1; then
  echo ""
  echo "[pre-push] ✗ Regression tests FAILED — push blocked."
  echo "[pre-push]   Fix failing tests before pushing."
  exit 1
fi

echo ""
echo "[pre-push] ✓ All tests passed — push proceeding."
HOOK

chmod +x "${PRE_PUSH}"
info "Installed pre-push hook at ${PRE_PUSH}"
info ""
info "To bypass in emergencies: git push --no-verify"
info "To uninstall: rm ${PRE_PUSH}"
