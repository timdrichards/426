#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ASSIGNMENTS_DIR="${REPO_ROOT}/assignments"
WEBSITE_ASSIGNMENTS_DIR="${REPO_ROOT}/website/docs/assignments"
WEBSITE_CODE_DIR="${REPO_ROOT}/website/static/code"
INCLUDE_DRAFTS=false

for arg in "$@"; do
  case "${arg}" in
    --include-drafts)
      INCLUDE_DRAFTS=true
      ;;
    *)
      echo "Unknown option: ${arg}" >&2
      echo "Usage: $0 [--include-drafts]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "${ASSIGNMENTS_DIR}" ]]; then
  echo "No assignments directory found at ${ASSIGNMENTS_DIR}; nothing to sync."
  exit 0
fi

mkdir -p "${WEBSITE_CODE_DIR}"

synced_count=0

sync_kind() {
  local kind="$1"
  local source_kind_dir="${ASSIGNMENTS_DIR}/${kind}"
  local website_kind_dir="${WEBSITE_ASSIGNMENTS_DIR}/${kind}"
  local expected_md
  local expected_zip

  expected_md="$(mktemp)"
  expected_zip="$(mktemp)"
  trap 'rm -f "${expected_md}" "${expected_zip}"' RETURN

  if [[ ! -d "${source_kind_dir}" ]]; then
    echo "Skipping ${kind}: source directory not found at ${source_kind_dir}"
    return
  fi

  mkdir -p "${website_kind_dir}"

  while IFS= read -r assignment_dir; do
    assignment_name="$(basename "${assignment_dir}")"

    if [[ "${INCLUDE_DRAFTS}" != true && "${assignment_name}" == _* ]]; then
      echo "Skipping draft folder: ${kind}/${assignment_name}"
      continue
    fi

    markdown_src="${assignment_dir}/${assignment_name}.md"
    code_src_dir="${assignment_dir}/${assignment_name}"
    markdown_dst="${website_kind_dir}/${assignment_name}.md"
    zip_dst="${WEBSITE_CODE_DIR}/${assignment_name}.zip"

    if [[ ! -f "${markdown_src}" ]]; then
      markdown_count="$(find "${assignment_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')"
      if [[ "${markdown_count}" == "1" ]]; then
        markdown_src="$(find "${assignment_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | head -n 1)"
      else
        echo "Skipping ${assignment_name}: expected ${assignment_name}.md or exactly one markdown file in ${assignment_dir}" >&2
        continue
      fi
    fi

    if [[ "${INCLUDE_DRAFTS}" != true ]] && rg -n --no-ignore-vcs --fixed-strings "draft: true" "${markdown_src}" >/dev/null 2>&1; then
      echo "Skipping draft markdown: ${kind}/${assignment_name} (draft: true)"
      continue
    fi

    cp "${markdown_src}" "${markdown_dst}"
    echo "Copied markdown: ${markdown_src#"${REPO_ROOT}/"} -> ${markdown_dst#"${REPO_ROOT}/"}"
    echo "$(basename "${markdown_dst}")" >> "${expected_md}"

    if [[ -d "${code_src_dir}" ]]; then
      rm -f "${zip_dst}"
      (
        cd "${assignment_dir}"
        zip -rq "${zip_dst}" "${assignment_name}" -x "*/node_modules/*" "*/dist/*"
      )
      echo "Built code zip: ${zip_dst#"${REPO_ROOT}/"}"
      echo "$(basename "${zip_dst}")" >> "${expected_zip}"
    else
      rm -f "${zip_dst}"
      echo "No code folder for ${assignment_name}; no code zip will be published."
    fi

    synced_count=$((synced_count + 1))
  done < <(find "${source_kind_dir}" -mindepth 1 -maxdepth 1 -type d | sort)

  while IFS= read -r published_md; do
    published_base="$(basename "${published_md}")"
    if ! grep -Fxq "${published_base}" "${expected_md}"; then
      rm -f "${published_md}"
      echo "Removed stale markdown: ${published_md#"${REPO_ROOT}/"}"

      stale_zip="${WEBSITE_CODE_DIR}/${published_base%.md}.zip"
      stale_zip_base="$(basename "${stale_zip}")"
      if [[ -f "${stale_zip}" ]] && ! grep -Fxq "${stale_zip_base}" "${expected_zip}"; then
        rm -f "${stale_zip}"
        echo "Removed stale code zip: ${stale_zip#"${REPO_ROOT}/"}"
      fi
    fi
  done < <(find "${website_kind_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | sort)
}

sync_kind "exercises"
sync_kind "homework"
sync_kind "project"
sync_kind "in-class-activities"

node "${SCRIPT_DIR}/generate-assignments-doc.js"

echo "Synced ${synced_count} assignment(s)."
