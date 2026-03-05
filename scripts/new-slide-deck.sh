#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Copy the latest lecture Slidev deck in ./website/docs/lectures/<NN>/slides to a new lecture folder.

Usage:
  scripts/new-slide-deck.sh [--dry-run] <new_deck_slug>

Examples:
  scripts/new-slide-deck.sh 11
  scripts/new-slide-deck.sh --dry-run 11
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LECTURES_DIR="${REPO_ROOT}/website/docs/lectures"

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

NEW_LECTURE="$1"
if [[ "${NEW_LECTURE}" == */* ]]; then
  echo "Error: lecture folder must not contain '/': ${NEW_LECTURE}" >&2
  exit 1
fi

if [[ ! -d "${LECTURES_DIR}" ]]; then
  echo "Error: lectures directory not found: ${LECTURES_DIR}" >&2
  exit 1
fi

SOURCE_DECK_DIR="$(find "${LECTURES_DIR}" -mindepth 2 -maxdepth 2 -type d -name slides | sort | tail -n 1)"
if [[ -z "${SOURCE_DECK_DIR}" ]]; then
  echo "Error: no existing lecture slides directories found in ${LECTURES_DIR}" >&2
  exit 1
fi

TARGET_LECTURE_DIR="${LECTURES_DIR}/${NEW_LECTURE}"
TARGET_DECK_DIR="${TARGET_LECTURE_DIR}/slides"
if [[ -e "${TARGET_LECTURE_DIR}" ]]; then
  echo "Error: target lecture folder already exists: ${TARGET_LECTURE_DIR}" >&2
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

echo "Created lecture slides at ${TARGET_DECK_DIR#"${REPO_ROOT}/"}"
