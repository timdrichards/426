#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEBSITE_DIR="${REPO_ROOT}/website"
LEGACY_SYNC=0

usage() {
  cat <<'EOF'
Website-first publish helper.

Default behavior:
  - Build only from files under website/
  - Publish all lecture Slidev decks into website/static/decks/
  - Do NOT sync/copy from legacy lecture content folders

Usage:
  scripts/publish-website.sh [--legacy-sync]

Options:
  --legacy-sync   Run old copy workflow (sync assignments, publish decks, zip code) before website build.
EOF
}

publish_all_slides() {
  if [[ ! -x "${SCRIPT_DIR}/publish-slidev-deck.sh" ]]; then
    return
  fi
  if [[ ! -d "${REPO_ROOT}/website/docs/lectures" ]]; then
    return
  fi

  echo "==> Publishing Slidev decks from website/docs/lectures/*/slides"
  while IFS= read -r deck_dir; do
    lecture_dir="$(dirname "${deck_dir}")"
    lecture_name="$(basename "${lecture_dir}")"
    if [[ -f "${deck_dir}/package.json" && -f "${deck_dir}/slides.md" ]]; then
      rel_deck_dir="${deck_dir#"${REPO_ROOT}/"}"
      "${SCRIPT_DIR}/publish-slidev-deck.sh" --install "${rel_deck_dir}" "${lecture_name}"
    fi
  done < <(find "${REPO_ROOT}/website/docs/lectures" -mindepth 2 -maxdepth 2 -type d -name slides | sort)
}

for arg in "$@"; do
  case "${arg}" in
    --legacy-sync)
      LEGACY_SYNC=1
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

if [[ ! -d "${WEBSITE_DIR}" ]]; then
  echo "Error: website directory not found at ${WEBSITE_DIR}" >&2
  exit 1
fi

if [[ "${LEGACY_SYNC}" -eq 1 ]]; then
  echo "==> Legacy sync mode enabled"
  echo "Skipping sync-assignments.sh: lecture-centric layout keeps assignment materials under website/docs/lectures/*"
  publish_all_slides
  if [[ -d "${REPO_ROOT}/website/docs/lectures" ]]; then
    mkdir -p "${REPO_ROOT}/website/static/code"
    while IFS= read -r lecture_dir; do
      lecture_name="$(basename "${lecture_dir}")"
      code_folder="${lecture_dir}/code"
      if [[ ! -d "${code_folder}" ]]; then
        continue
      fi
      zip_path="${REPO_ROOT}/website/static/code/${lecture_name}.zip"
      rm -f "${zip_path}"
      (
        cd "${lecture_dir}"
        zip -rq "${zip_path}" "code" -x "*/node_modules/*" "*/dist/*"
      )
    done < <(find "${REPO_ROOT}/website/docs/lectures" -mindepth 1 -maxdepth 1 -type d | sort)
  fi
else
  echo "==> Website-first mode (no sync/copy from legacy content folders)"
  publish_all_slides
fi

echo "==> Generating assignments index"
node "${SCRIPT_DIR}/generate-assignments-doc.js"

echo "==> Building Docusaurus from website/"
(
  cd "${WEBSITE_DIR}"
  npm run build
)

echo "Build complete."
