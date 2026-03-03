#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SLIDES_DIR="${REPO_ROOT}/slides"
CODE_DIR="${REPO_ROOT}/code"
STATIC_DECKS_DIR="${REPO_ROOT}/website/static/decks"
STATIC_CODE_DIR="${REPO_ROOT}/website/static/code"
SYNC_ASSIGNMENTS_SCRIPT="${SCRIPT_DIR}/sync-assignments.sh"

# Prefer the script name requested by user if it exists, fallback to current script.
if [[ -x "${SCRIPT_DIR}/public-slidev-persistence.sh" ]]; then
  DECK_PUBLISH_SCRIPT="${SCRIPT_DIR}/public-slidev-persistence.sh"
else
  DECK_PUBLISH_SCRIPT="${SCRIPT_DIR}/publish-slidev-deck.sh"
fi

if [[ ! -x "${DECK_PUBLISH_SCRIPT}" ]]; then
  echo "Error: deck publish script not found or not executable: ${DECK_PUBLISH_SCRIPT}" >&2
  exit 1
fi

cd "${REPO_ROOT}"

if [[ -x "${SYNC_ASSIGNMENTS_SCRIPT}" ]]; then
  echo "==> Syncing assignments into website docs/static"
  "${SYNC_ASSIGNMENTS_SCRIPT}"
else
  echo "Assignments sync script not found or not executable, skipping: ${SYNC_ASSIGNMENTS_SCRIPT}"
fi

echo "==> Publishing Slidev decks from ${SLIDES_DIR}"
mkdir -p "${STATIC_DECKS_DIR}"

if [[ -d "${SLIDES_DIR}" ]]; then
  while IFS= read -r deck_dir; do
    deck_name="$(basename "${deck_dir}")"
    if [[ ! -f "${deck_dir}/package.json" || ! -f "${deck_dir}/slides.md" ]]; then
      echo "Skipping ${deck_name}: missing package.json or slides.md"
      continue
    fi
    rel_deck_dir="${deck_dir#"${REPO_ROOT}/"}"
    echo "Publishing deck: ${rel_deck_dir}"
    "${DECK_PUBLISH_SCRIPT}" "${rel_deck_dir}" "${deck_name}"
  done < <(find "${SLIDES_DIR}" -mindepth 1 -maxdepth 1 -type d | sort)
else
  echo "Slides directory not found, skipping."
fi

echo "==> Zipping code folders into ${STATIC_CODE_DIR}"
mkdir -p "${STATIC_CODE_DIR}"

if [[ -d "${CODE_DIR}" ]]; then
  while IFS= read -r code_folder; do
    folder_name="$(basename "${code_folder}")"
    zip_path="${STATIC_CODE_DIR}/${folder_name}.zip"
    echo "Creating ${zip_path}"
    rm -f "${zip_path}"
    (
      cd "${CODE_DIR}"
      zip -rq "${zip_path}" "${folder_name}" -x "*/node_modules/*" "*/dist/*"
    )
  done < <(find "${CODE_DIR}" -mindepth 1 -maxdepth 1 -type d | sort)
else
  echo "Code directory not found, skipping."
fi

publish_status="$(git status --porcelain -- website/static/decks website/static/code website/docs/assignments website/docs/assignments.md)"
if [[ -z "${publish_status}" ]]; then
  echo "No publish output changes detected in synced assignments or website assets."
  exit 0
fi

echo "==> Staging repository changes"
git add -A

staged_status="$(git diff --cached --name-status)"
if [[ -z "${staged_status}" ]]; then
  echo "No staged changes found after git add -A."
  exit 0
fi

echo
echo "Changes detected."
echo "Run 'git status' to inspect details."
echo
read -r -p "Commit and push publish changes? [y/N]: " do_commit
if [[ ! "${do_commit}" =~ ^[Yy]$ ]]; then
  echo "Skipped commit/push."
  exit 0
fi

timestamp="$(date -u +"%Y-%m-%d %H:%M:%SZ")"
commit_message="chore(publish): publish website assets (${timestamp})"

git commit -m "${commit_message}"
git push origin main

read -r -p "Create and push a publish tag? [y/N]: " do_tag
if [[ ! "${do_tag}" =~ ^[Yy]$ ]]; then
  echo "Publish complete (no tag created)."
  exit 0
fi

default_tag="website-publish-$(date -u +%Y%m%d-%H%M%S)"
read -r -p "Tag name [${default_tag}]: " tag_name
tag_name="${tag_name:-${default_tag}}"

git tag "${tag_name}"
git push origin "${tag_name}"

echo "Publish complete with tag ${tag_name}."
