#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Copy the latest Slidev deck in ./slides to a new deck folder.

Usage:
  scripts/new-slide-deck.sh [--dry-run] <new_deck_slug>

Examples:
  scripts/new-slide-deck.sh 09-observability
  scripts/new-slide-deck.sh --dry-run 09-observability
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SLIDES_DIR="${REPO_ROOT}/slides"

DRY_RUN=0
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

set -- "${POSITIONAL[@]}"

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

NEW_DECK_SLUG="$1"
if [[ "${NEW_DECK_SLUG}" == */* ]]; then
  echo "Error: new deck slug must not contain '/': ${NEW_DECK_SLUG}" >&2
  exit 1
fi

if [[ ! -d "${SLIDES_DIR}" ]]; then
  echo "Error: slides directory not found: ${SLIDES_DIR}" >&2
  exit 1
fi

SOURCE_DECK_DIR="$(find "${SLIDES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
if [[ -z "${SOURCE_DECK_DIR}" ]]; then
  echo "Error: no existing deck directories found in ${SLIDES_DIR}" >&2
  exit 1
fi

TARGET_DECK_DIR="${SLIDES_DIR}/${NEW_DECK_SLUG}"
if [[ -e "${TARGET_DECK_DIR}" ]]; then
  echo "Error: target deck already exists: ${TARGET_DECK_DIR}" >&2
  exit 1
fi

echo "Source deck: ${SOURCE_DECK_DIR#"${REPO_ROOT}/"}"
echo "Target deck: ${TARGET_DECK_DIR#"${REPO_ROOT}/"}"

RSYNC_ARGS=(
  -a
  --exclude "node_modules/"
  --exclude "dist/"
  --exclude "*/node_modules/"
  --exclude "*/dist/"
)

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "[dry-run] No files copied."
  rsync "${RSYNC_ARGS[@]}" --dry-run "${SOURCE_DECK_DIR}/" "${TARGET_DECK_DIR}/"
  exit 0
fi

mkdir -p "${TARGET_DECK_DIR}"
rsync "${RSYNC_ARGS[@]}" "${SOURCE_DECK_DIR}/" "${TARGET_DECK_DIR}/"

echo "Created new deck at ${TARGET_DECK_DIR#"${REPO_ROOT}/"}"
