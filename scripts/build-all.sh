#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LECTURES_ROOT="${REPO_ROOT}/website/docs/lectures"
WEBSITE_DIR="${REPO_ROOT}/website"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/426-build-all.XXXXXX")"
DO_INSTALL=0

cleanup() {
  rm -rf "${TMP_ROOT}"
}
trap cleanup EXIT

usage() {
  cat <<'EOF'
Build-check everything from the repo root.

What it does:
  1) Builds each lecture Slidev deck to a temporary output directory.
  2) Builds the Docusaurus website.

Usage:
  scripts/build-all.sh [--install]

Options:
  --install   Always run npm install inside each Slidev deck before building.
  -h, --help  Show this help.
EOF
}

for arg in "$@"; do
  case "${arg}" in
    --install)
      DO_INSTALL=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "${LECTURES_ROOT}" ]]; then
  echo "Error: lectures directory not found at ${LECTURES_ROOT}" >&2
  exit 1
fi

if [[ ! -d "${WEBSITE_DIR}" ]]; then
  echo "Error: website directory not found at ${WEBSITE_DIR}" >&2
  exit 1
fi

echo "==> Building Slidev lecture decks (temporary output)"
while IFS= read -r deck_dir; do
  lecture_dir="$(dirname "${deck_dir}")"
  lecture_name="$(basename "${lecture_dir}")"

  if [[ ! -f "${deck_dir}/package.json" || ! -f "${deck_dir}/slides.md" ]]; then
    continue
  fi

  out_dir="${TMP_ROOT}/decks/${lecture_name}"
  mkdir -p "${out_dir}"
  echo " -> lecture ${lecture_name}"

  pushd "${deck_dir}" >/dev/null
  if [[ "${DO_INSTALL}" -eq 1 ]]; then
    npm install
  elif [[ ! -d "${deck_dir}/node_modules" ]]; then
    echo "Error: missing dependencies in ${deck_dir}. Run with --install." >&2
    exit 1
  fi
  npm run build -- --base "/$(basename "${REPO_ROOT}")/decks/${lecture_name}/" --out "${out_dir}"
  popd >/dev/null
done < <(find "${LECTURES_ROOT}" -mindepth 2 -maxdepth 2 -type d -name slides | sort)

echo "==> Generating assignments index"
node "${SCRIPT_DIR}/generate-assignments-doc.js"

echo "==> Building Docusaurus website"
(
  cd "${WEBSITE_DIR}"
  npm run build
)

echo "Build check complete."
