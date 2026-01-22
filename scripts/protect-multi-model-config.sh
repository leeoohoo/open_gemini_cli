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

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "Not inside a git repository."
fi

protected_files=(
  "packages/cli/src/config/settingsSchema.ts"
  "packages/cli/src/config/config.ts"
  "packages/core/src/core/contentGenerator.ts"
)

for file in "${protected_files[@]}"; do
  if [ ! -f "${file}" ]; then
    die "Missing required file: ${file}"
  fi
done

changed=$(git diff --name-only HEAD -- "${protected_files[@]}" || true)
if [ -n "${changed}" ]; then
  log "Protected config files modified during sync:"
  printf '%s\n' "${changed}" | sed 's/^/ - /'
  die "Review and reconcile protected files before continuing."
fi

contains() {
  local needle=$1
  local file=$2

  if command -v rg >/dev/null 2>&1; then
    rg -n -F "${needle}" "${file}" >/dev/null
  else
    grep -nF "${needle}" "${file}" >/dev/null
  fi
}

log "Validating provider defaults and model selection logic."

if ! contains "default: 'openai'" "packages/cli/src/config/settingsSchema.ts"; then
  die "Expected provider default 'openai' not found in settings schema."
fi

if ! contains "const modelProvider = settings.model?.provider ?? 'openai';" "packages/cli/src/config/config.ts"; then
  die "Expected model provider fallback not found in config."
fi

if ! contains "openaiSettings.model ?? envModel ?? 'gpt-4o-mini'" "packages/cli/src/config/config.ts"; then
  die "Expected OpenAI default model logic not found in config."
fi

if ! contains "config.getModelProvider?.() ?? (authType ? 'google' : 'openai');" "packages/core/src/core/contentGenerator.ts"; then
  die "Expected provider selection default not found in content generator."
fi

log "Multi-model config protection checks passed."
