#!/bin/sh
set -eu

API_URL="${API_URL:-http://api:3000}"
TIMEOUT_SEC="${DEMO_TIMEOUT_SEC:-20}"

post_job() {
  job_id="$1"
  body_file="$2"

  curl -sS --max-time "${TIMEOUT_SEC}" \
    -o "${body_file}" \
    -w "%{http_code} %{time_total}" \
    -X POST "${API_URL}/tasks" \
    -H 'content-type: application/json' \
    -d "{\"jobId\":\"${job_id}\"}"
}

fetch_effect_count() {
  job_id="$1"
  curl -sS "${API_URL}/effects/${job_id}" | jq -r '.effectCount // 0'
}

fetch_attempts() {
  job_id="$1"
  curl -sS "${API_URL}/jobs/${job_id}" | jq -r '.processAttempts // 0'
}

fetch_status() {
  job_id="$1"
  curl -sS "${API_URL}/jobs/${job_id}" | jq -r '.status // "unknown"'
}

wait_for_completion() {
  job_id="$1"
  expected_attempts="$2"

  tries=1
  while [ "${tries}" -le 40 ]; do
    attempts="$(fetch_attempts "${job_id}" || echo 0)"
    effects="$(fetch_effect_count "${job_id}" || echo 0)"
    status="$(fetch_status "${job_id}" || echo unknown)"
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

cmd_help() {
  cat <<'HELP'
Usage:
  run.sh duplicate-observe [job_id] [submissions]
  run.sh duplicate-load [unique_jobs] [duplicates_per_job]
  run.sh poll-job <job_id>

Examples:
  run.sh duplicate-observe
  run.sh duplicate-observe order-123 2
  run.sh duplicate-load 8 2
  run.sh poll-job order-123
HELP
}

cmd_duplicate_observe() {
  job_id="${1:-activity2-observe-$(date +%s)-$$}"
  submissions="${2:-2}"

  echo "jobId=${job_id} submissions=${submissions}"

  i=1
  while [ "${i}" -le "${submissions}" ]; do
    body_file="$(mktemp)"
    metrics="$(post_job "${job_id}" "${body_file}")"
    code="$(echo "${metrics}" | awk '{print $1}')"
    total_time="$(echo "${metrics}" | awk '{print $2}')"

    echo "submit=${i} status=${code} total_time_s=${total_time}"
    cat "${body_file}" | jq .

    rm -f "${body_file}"
    i=$((i + 1))
  done

  wait_for_completion "${job_id}" "${submissions}" || true

  echo "job summary:"
  curl -sS "${API_URL}/jobs/${job_id}" | jq .

  echo "effects summary:"
  curl -sS "${API_URL}/effects/${job_id}" | jq .

  echo "If idempotency is not implemented, effectCount should be close to submissions."
  echo "If idempotency is implemented, effectCount should stay at 1."
}

cmd_duplicate_load() {
  unique_jobs="${1:-8}"
  duplicates_per_job="${2:-2}"

  ids_file="$(mktemp)"
  results_file="$(mktemp)"

  i=1
  while [ "${i}" -le "${unique_jobs}" ]; do
    job_id="activity2-load-${i}-$(date +%s)-$$"
    echo "${job_id}" >> "${ids_file}"

    d=1
    while [ "${d}" -le "${duplicates_per_job}" ]; do
      (
        body_file="$(mktemp)"
        if metrics="$(post_job "${job_id}" "${body_file}")"; then
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
    wait_for_completion "${job_id}" "${duplicates_per_job}" || true
    effects="$(fetch_effect_count "${job_id}")"
    total_effects=$((total_effects + effects))
  done < "${ids_file}"

  submissions=$((unique_jobs * duplicates_per_job))

  echo "unique_jobs=${unique_jobs}"
  echo "submissions=${submissions}"
  echo "observed_effects_total=${total_effects}"
  echo "Before idempotency: observed_effects_total should be near submissions."
  echo "After idempotency: observed_effects_total should be near unique_jobs."

  rm -f "${ids_file}" "${results_file}"
}

cmd_poll_job() {
  job_id="${1:-}"
  if [ -z "${job_id}" ]; then
    echo "poll-job requires a job_id" >&2
    exit 1
  fi

  echo "job summary:"
  curl -sS "${API_URL}/jobs/${job_id}" | jq .

  echo "effects summary:"
  curl -sS "${API_URL}/effects/${job_id}" | jq .
}

command="${1:-help}"
shift || true

case "${command}" in
  help|-h|--help)
    cmd_help
    ;;
  duplicate-observe)
    cmd_duplicate_observe "$@"
    ;;
  duplicate-load)
    cmd_duplicate_load "$@"
    ;;
  poll-job)
    cmd_poll_job "$@"
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    cmd_help
    exit 1
    ;;
esac
