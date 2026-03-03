#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ASSIGNMENTS_DIR="${REPO_ROOT}/assignments"
WEBSITE_ASSIGNMENTS_DIR="${REPO_ROOT}/website/docs/assignments"
WEBSITE_CODE_DIR="${REPO_ROOT}/website/static/code"
INCLUDE_DRAFTS=false
EXCALIDRAW_EXPORTER="excalidraw-brute-export-cli@0.4.0"

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

is_markdown_draft() {
  local markdown_file="$1"
  rg -n "^[[:space:]]*draft:[[:space:]]*true[[:space:]]*$" "${markdown_file}" >/dev/null 2>&1
}

resolve_markdown_file() {
  local assignment_dir="$1"
  local assignment_name="$2"
  local preferred="${assignment_dir}/${assignment_name}.md"

  if [[ -f "${preferred}" ]]; then
    echo "${preferred}"
    return 0
  fi

  local markdown_count
  markdown_count="$(find "${assignment_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')"
  if [[ "${markdown_count}" == "1" ]]; then
    find "${assignment_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | head -n 1
    return 0
  fi

  return 1
}

export_excalidraw_diagrams() {
  local assignment_dir="$1"
  local excalidraw_dir="${assignment_dir}/excalidraw"
  local images_dir="${assignment_dir}/images"

  if [[ ! -d "${excalidraw_dir}" ]]; then
    return 0
  fi

  mkdir -p "${images_dir}"

  while IFS= read -r excalidraw_file; do
    local base_name output_png
    base_name="$(basename "${excalidraw_file}" .excalidraw)"
    output_png="${images_dir}/${base_name}.png"

    echo "Exporting Excalidraw: ${excalidraw_file#"${REPO_ROOT}/"} -> ${output_png#"${REPO_ROOT}/"}"
    npx -y "${EXCALIDRAW_EXPORTER}" \
      -i "${excalidraw_file}" \
      -o "${output_png}" \
      -f png \
      -s 2 \
      --headless true
  done < <(find "${excalidraw_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.excalidraw" | sort)
}

sync_kind() {
  local kind="$1"
  local source_kind_dir="${ASSIGNMENTS_DIR}/${kind}"
  local website_kind_dir="${WEBSITE_ASSIGNMENTS_DIR}/${kind}"

  local expected_dirs expected_zips
  expected_dirs="$(mktemp)"
  expected_zips="$(mktemp)"

  if [[ ! -d "${source_kind_dir}" ]]; then
    echo "Skipping ${kind}: source directory not found at ${source_kind_dir}"
    rm -f "${expected_dirs}" "${expected_zips}"
    return
  fi

  mkdir -p "${website_kind_dir}"

  while IFS= read -r assignment_dir; do
    local assignment_name markdown_src code_src_dir
    local destination_dir zip_dst

    assignment_name="$(basename "${assignment_dir}")"

    if [[ "${INCLUDE_DRAFTS}" != true && "${assignment_name}" == _* ]]; then
      echo "Skipping draft folder: ${kind}/${assignment_name}"
      continue
    fi

    if ! markdown_src="$(resolve_markdown_file "${assignment_dir}" "${assignment_name}")"; then
      echo "Skipping ${assignment_name}: expected ${assignment_name}.md or exactly one markdown file in ${assignment_dir}" >&2
      continue
    fi

    if [[ "${INCLUDE_DRAFTS}" != true ]] && is_markdown_draft "${markdown_src}"; then
      echo "Skipping draft markdown: ${kind}/${assignment_name} (draft: true)"
      continue
    fi

    export_excalidraw_diagrams "${assignment_dir}"

    destination_dir="${website_kind_dir}/${assignment_name}"
    mkdir -p "${destination_dir}"
    rsync -a --delete --delete-excluded \
      --exclude ".DS_Store" \
      --exclude "excalidraw/" \
      --exclude "${assignment_name}/" \
      "${assignment_dir}/" "${destination_dir}/"
    echo "Copied folder: ${assignment_dir#"${REPO_ROOT}/"} -> ${destination_dir#"${REPO_ROOT}/"}"

    echo "${destination_dir}" >> "${expected_dirs}"

    # Remove legacy flat markdown output from previous sync format.
    local legacy_md
    legacy_md="${website_kind_dir}/${assignment_name}.md"
    if [[ -f "${legacy_md}" ]]; then
      rm -f "${legacy_md}"
      echo "Removed legacy markdown path: ${legacy_md#"${REPO_ROOT}/"}"
    fi

    code_src_dir="${assignment_dir}/${assignment_name}"
    zip_dst="${WEBSITE_CODE_DIR}/${assignment_name}.zip"

    if [[ -d "${code_src_dir}" ]]; then
      rm -f "${zip_dst}"
      (
        cd "${assignment_dir}"
        zip -rq "${zip_dst}" "${assignment_name}" -x "*/node_modules/*" "*/dist/*"
      )
      echo "Built code zip: ${zip_dst#"${REPO_ROOT}/"}"
      echo "$(basename "${zip_dst}")" >> "${expected_zips}"
    else
      rm -f "${zip_dst}"
      echo "No code folder for ${assignment_name}; no code zip will be published."
    fi

    synced_count=$((synced_count + 1))
  done < <(find "${source_kind_dir}" -mindepth 1 -maxdepth 1 -type d | sort)

  while IFS= read -r published_dir; do
    local base_name
    base_name="$(basename "${published_dir}")"

    if ! grep -Fxq "${published_dir}" "${expected_dirs}"; then
      rm -rf "${published_dir}"
      echo "Removed stale assignment folder: ${published_dir#"${REPO_ROOT}/"}"

      local stale_zip
      stale_zip="${WEBSITE_CODE_DIR}/${base_name}.zip"
      if [[ -f "${stale_zip}" ]] && ! grep -Fxq "$(basename "${stale_zip}")" "${expected_zips}"; then
        rm -f "${stale_zip}"
        echo "Removed stale code zip: ${stale_zip#"${REPO_ROOT}/"}"
      fi
    fi
  done < <(find "${website_kind_dir}" -mindepth 1 -maxdepth 1 -type d | sort)

  # Remove any stale flat markdown files from old sync format.
  while IFS= read -r published_md; do
    rm -f "${published_md}"
    echo "Removed stale markdown: ${published_md#"${REPO_ROOT}/"}"

    local stale_zip
    stale_zip="${WEBSITE_CODE_DIR}/$(basename "${published_md}" .md).zip"
    if [[ -f "${stale_zip}" ]] && ! grep -Fxq "$(basename "${stale_zip}")" "${expected_zips}"; then
      rm -f "${stale_zip}"
      echo "Removed stale code zip: ${stale_zip#"${REPO_ROOT}/"}"
    fi
  done < <(find "${website_kind_dir}" -mindepth 1 -maxdepth 1 -type f -name "*.md" | sort)

  rm -f "${expected_dirs}" "${expected_zips}"
}

sync_kind "exercises"
sync_kind "homework"
sync_kind "project"
sync_kind "in-class-activities"

node "${SCRIPT_DIR}/generate-assignments-doc.js"

echo "Synced ${synced_count} assignment(s)."
