#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Build a Slidev deck directly into website/static/decks.

Usage:
  scripts/publish-slidev-deck.sh [options] <deck_dir> [deck_slug]

Arguments:
  deck_dir                 Path to the Slidev deck directory (contains package.json/slides.md).
  deck_slug                Optional URL/output slug. Defaults to basename(deck_dir).

Options:
  --site-base <path>       Docusaurus base URL prefix (default: /<repo-name>/).
                           Example: --site-base /326/
  --install                Run npm install in the deck directory before build.
  --dry-run                Print actions without building/copying.
  -h, --help               Show this help.

Examples:
  scripts/publish-slidev-deck.sh website/docs/lectures/09/slides 09
  scripts/publish-slidev-deck.sh --site-base /326/ website/docs/lectures/09/slides 09
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SITE_BASE=""
DO_INSTALL=0
DRY_RUN=0

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --site-base)
      SITE_BASE="${2:-}"
      shift 2
      ;;
    --install)
      DO_INSTALL=1
      shift
      ;;
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

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

DECK_DIR_INPUT="$1"
DECK_SLUG="${2:-}"

if [[ -z "${SITE_BASE}" ]]; then
  SITE_BASE="/$(basename "${REPO_ROOT}")/"
fi

# Normalize site base to leading+trailing slash
SITE_BASE="/${SITE_BASE#/}"
if [[ "${SITE_BASE}" != */ ]]; then
  SITE_BASE="${SITE_BASE}/"
fi

if [[ "${DECK_DIR_INPUT}" = /* ]]; then
  DECK_DIR="${DECK_DIR_INPUT}"
else
  DECK_DIR="${REPO_ROOT}/${DECK_DIR_INPUT}"
fi

if [[ ! -d "${DECK_DIR}" ]]; then
  echo "Error: deck directory not found: ${DECK_DIR}" >&2
  exit 1
fi

if [[ ! -f "${DECK_DIR}/package.json" ]]; then
  echo "Error: package.json not found in deck directory: ${DECK_DIR}" >&2
  exit 1
fi

if [[ ! -f "${DECK_DIR}/slides.md" ]]; then
  echo "Error: slides.md not found in deck directory: ${DECK_DIR}" >&2
  exit 1
fi

if [[ -z "${DECK_SLUG}" ]]; then
  DECK_SLUG="$(basename "${DECK_DIR}")"
fi

DECK_BASE_PATH="${SITE_BASE}decks/${DECK_SLUG}/"
TARGET_DIR="${REPO_ROOT}/website/static/decks/${DECK_SLUG}"

echo "Repo root:        ${REPO_ROOT}"
echo "Deck dir:         ${DECK_DIR}"
echo "Deck slug:        ${DECK_SLUG}"
echo "Deck base path:   ${DECK_BASE_PATH}"
echo "Target dir:       ${TARGET_DIR}"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo "[dry-run] Would run: npm run build -- --base ${DECK_BASE_PATH} --out ${TARGET_DIR}"
  if [[ "${DO_INSTALL}" -eq 1 ]]; then
    echo "[dry-run] Would run: npm install"
  fi
  echo "[dry-run] Would remove existing: ${TARGET_DIR}"
  exit 0
fi

rm -rf "${TARGET_DIR}"
mkdir -p "$(dirname "${TARGET_DIR}")"

pushd "${DECK_DIR}" >/dev/null
if [[ "${DO_INSTALL}" -eq 1 ]]; then
  npm install
fi
npm run build -- --base "${DECK_BASE_PATH}" --out "${TARGET_DIR}"
popd >/dev/null

echo
echo "Deck published."
echo "Website static path: website/static/decks/${DECK_SLUG}/"
echo "Served URL path:     ${DECK_BASE_PATH}"
