#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

log() {
  printf '%s\n' "INFO: $*"
}

die() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

log "Running multi-model config protection checks."
./scripts/protect-multi-model-config.sh

conflicts=$(git diff --name-only --diff-filter=U || true)
if [ -n "${conflicts}" ]; then
  log "Merge conflicts detected:"
  printf '%s\n' "${conflicts}" | sed 's/^/ - /'
  die "Resolve merge conflicts before validation."
fi

log "Running basic script tests."
if ! command -v npm >/dev/null 2>&1; then
  die "npm is required but was not found."
fi

if [ ! -d node_modules ]; then
  die "node_modules not found. Run 'npm ci' before validation."
fi

npm run test:scripts

log "Sync validation completed successfully."
