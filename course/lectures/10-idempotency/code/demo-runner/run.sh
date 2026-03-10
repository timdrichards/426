#!/bin/sh
set -eu

NO_IDEM_URL="${NO_IDEM_URL:-http://api-no-idem:3000}"
IDEM_URL="${IDEM_URL:-http://api-idem:3000}"
TIMEOUT_SEC="${DEMO_TIMEOUT_SEC:-20}"

post_job() {
  target_url="$1"
  job_id="$2"
  body_file="$3"

  curl -sS --max-time "${TIMEOUT_SEC}" \
    -o "${body_file}" \
    -w "%{http_code} %{time_total}" \
    -X POST "${target_url}/tasks" \
    -H 'content-type: application/json' \
    -d "{\"jobId\":\"${job_id}\"}"
}

fetch_effect_count() {
  target_url="$1"
  job_id="$2"
  curl -sS "${target_url}/effects/${job_id}" | jq -r '.effectCount // 0'
}

fetch_attempts() {
  target_url="$1"
  job_id="$2"
  curl -sS "${target_url}/jobs/${job_id}" | jq -r '.processAttempts // 0'
}

fetch_status() {
  target_url="$1"
  job_id="$2"
  curl -sS "${target_url}/jobs/${job_id}" | jq -r '.status // "unknown"'
}

wait_for_completion() {
  target_url="$1"
  job_id="$2"
  expected_attempts="$3"

  tries=1
  while [ "${tries}" -le 40 ]; do
    attempts="$(fetch_attempts "${target_url}" "${job_id}" || echo 0)"
    effects="$(fetch_effect_count "${target_url}" "${job_id}" || echo 0)"
    status="$(fetch_status "${target_url}" "${job_id}" || echo unknown)"
    echo "poll=${tries} status=${status} attempts=${attempts} effects=${effects}"

    if [ "${attempts}" -ge "${expected_attempts}" ] && [ "${status}" != "processing" ] && [ "${status}" != "queued" ]; then
      return 0
    fi

    sleep 1
    tries=$((tries + 1))
  done

  return 1
}

summarize_http_results() {
  results_file="$1"
  awk '
    {
      n += 1
      codes[$1] += 1
      t = $2 + 0
      sum += t
      if (min == 0 || t < min) min = t
      if (t > max) max = t
    }
    END {
      printf("requests=%d\n", n)
      for (code in codes) {
        printf("status_%s=%d\n", code, codes[code])
      }
      if (n > 0) {
        printf("latency_avg_s=%.3f\n", sum / n)
        printf("latency_min_s=%.3f\n", min)
        printf("latency_max_s=%.3f\n", max)
      }
    }
  ' "${results_file}" | sort
}

observe_duplicate() {
  label="$1"
  target_url="$2"
  expected_effects="$3"

  job_id="${label}-$(date +%s)-$$"
  echo "jobId=${job_id}"

  i=1
  while [ "${i}" -le 2 ]; do
    body_file="$(mktemp)"
    metrics="$(post_job "${target_url}" "${job_id}" "${body_file}")"
    code="$(echo "${metrics}" | awk '{print $1}')"
    total_time="$(echo "${metrics}" | awk '{print $2}')"

    echo "submit=${i} status=${code} total_time_s=${total_time}"
    cat "${body_file}" | jq .
    rm -f "${body_file}"

    i=$((i + 1))
  done

  wait_for_completion "${target_url}" "${job_id}" 2 || true

  echo "job summary:"
  curl -sS "${target_url}/jobs/${job_id}" | jq .

  echo "effects summary:"
  curl -sS "${target_url}/effects/${job_id}" | jq .

  actual_effects="$(fetch_effect_count "${target_url}" "${job_id}")"
  echo "expected_effects=${expected_effects} observed_effects=${actual_effects}"
}

load_duplicates() {
  label="$1"
  target_url="$2"
  unique_jobs="$3"
  duplicates_per_job="$4"
  expected_per_job="$5"

  ids_file="$(mktemp)"
  results_file="$(mktemp)"

  i=1
  while [ "${i}" -le "${unique_jobs}" ]; do
    job_id="${label}-${i}-$(date +%s)-$$"
    echo "${job_id}" >> "${ids_file}"

    d=1
    while [ "${d}" -le "${duplicates_per_job}" ]; do
      (
        body_file="$(mktemp)"
        if metrics="$(post_job "${target_url}" "${job_id}" "${body_file}")"; then
          code="$(echo "${metrics}" | awk '{print $1}')"
          total_time="$(echo "${metrics}" | awk '{print $2}')"
        else
          code="000"
          total_time="0"
        fi
        echo "${code} ${total_time}" >> "${results_file}"
        rm -f "${body_file}"
      ) &
      d=$((d + 1))
    done

    i=$((i + 1))
  done

  wait
  summarize_http_results "${results_file}"

  total_effects=0
  while IFS= read -r job_id; do
    wait_for_completion "${target_url}" "${job_id}" "${duplicates_per_job}" || true
    effects="$(fetch_effect_count "${target_url}" "${job_id}")"
    total_effects=$((total_effects + effects))
  done < "${ids_file}"

  submissions=$((unique_jobs * duplicates_per_job))
  expected_total=$((unique_jobs * expected_per_job))

  echo "unique_jobs=${unique_jobs}"
  echo "submissions=${submissions}"
  echo "expected_effects_total=${expected_total}"
  echo "observed_effects_total=${total_effects}"

  rm -f "${ids_file}" "${results_file}"
}

cmd_help() {
  cat <<'HELP'
Usage:
  run.sh no-idem-observe
  run.sh idem-observe
  run.sh no-idem-load [unique_jobs] [duplicates_per_job]
  run.sh idem-load [unique_jobs] [duplicates_per_job]

Examples:
  run.sh no-idem-observe
  run.sh idem-observe
  run.sh no-idem-load 8 2
  run.sh idem-load 8 2
HELP
}

cmd_no_idem_observe() {
  echo "=== no-idem-observe ==="
  observe_duplicate "no-idem-observe" "${NO_IDEM_URL}" 2
}

cmd_idem_observe() {
  echo "=== idem-observe ==="
  observe_duplicate "idem-observe" "${IDEM_URL}" 1
}

cmd_no_idem_load() {
  unique_jobs="${1:-8}"
  duplicates_per_job="${2:-2}"
  echo "=== no-idem-load unique_jobs=${unique_jobs} duplicates_per_job=${duplicates_per_job} ==="
  load_duplicates "no-idem-load" "${NO_IDEM_URL}" "${unique_jobs}" "${duplicates_per_job}" "${duplicates_per_job}"
}

cmd_idem_load() {
  unique_jobs="${1:-8}"
  duplicates_per_job="${2:-2}"
  echo "=== idem-load unique_jobs=${unique_jobs} duplicates_per_job=${duplicates_per_job} ==="
  load_duplicates "idem-load" "${IDEM_URL}" "${unique_jobs}" "${duplicates_per_job}" 1
}

command="${1:-help}"
shift || true

case "${command}" in
  help|-h|--help)
    cmd_help
    ;;
  no-idem-observe)
    cmd_no_idem_observe "$@"
    ;;
  idem-observe)
    cmd_idem_observe "$@"
    ;;
  no-idem-load)
    cmd_no_idem_load "$@"
    ;;
  idem-load)
    cmd_idem_load "$@"
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    cmd_help
    exit 1
    ;;
esac
