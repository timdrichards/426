#!/bin/sh
set -eu

BASELINE_URL="${BASELINE_URL:-http://api-baseline:3000}"
RELIEF_URL="${RELIEF_URL:-http://api-relief:3000}"
TIMEOUT_SEC="${DEMO_TIMEOUT_SEC:-20}"

post_task() {
  target_url="$1"
  request_id="$2"
  body_file="$3"

  curl -sS --max-time "${TIMEOUT_SEC}" \
    -o "${body_file}" \
    -w "%{http_code} %{time_total}" \
    -X POST "${target_url}/tasks" \
    -H 'content-type: application/json' \
    -d "{\"id\":\"${request_id}\"}"
}

summarize_results() {
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

show_queue_depth() {
  echo "queue-depth:"
  curl -sS "${RELIEF_URL}/queue-depth" | jq .
}

run_load() {
  label="$1"
  target_url="$2"
  request_count="$3"
  concurrency="$4"
  capture_jobs="$5"

  results_file="$(mktemp)"
  jobs_file="$(mktemp)"

  i=1
  while [ "${i}" -le "${request_count}" ]; do
    (
      request_id="${label}-${i}-$(date +%s)-$$"
      body_file="$(mktemp)"

      if metrics="$(post_task "${target_url}" "${request_id}" "${body_file}")"; then
        code="$(echo "${metrics}" | awk '{print $1}')"
        total_time="$(echo "${metrics}" | awk '{print $2}')"
      else
        code="000"
        total_time="0"
      fi

      echo "${code} ${total_time}" >> "${results_file}"

      if [ "${capture_jobs}" = "1" ] && [ "${code}" = "202" ]; then
        job_id="$(jq -r '.jobId // empty' "${body_file}" 2>/dev/null || true)"
        if [ -n "${job_id}" ]; then
          echo "${job_id}" >> "${jobs_file}"
        fi
      fi

      rm -f "${body_file}"
    ) &

    if [ $((i % concurrency)) -eq 0 ]; then
      wait
    fi

    i=$((i + 1))
  done

  wait

  summarize_results "${results_file}"

  if [ "${capture_jobs}" = "1" ]; then
    accepted_jobs="$(wc -l < "${jobs_file}" | tr -d ' ')"
    echo "accepted_jobs=${accepted_jobs}"
    show_queue_depth
    echo "tip: run 'docker compose logs -f worker' in another terminal to watch async processing"
  fi

  rm -f "${results_file}" "${jobs_file}"
}

wait_for_job() {
  job_id="$1"

  attempt=1
  while [ "${attempt}" -le 25 ]; do
    response="$(curl -sS "${RELIEF_URL}/jobs/${job_id}" || true)"
    status="$(echo "${response}" | jq -r '.status // "unknown"' 2>/dev/null || true)"

    echo "poll=${attempt} status=${status}"

    if [ "${status}" = "done" ] || [ "${status}" = "failed" ]; then
      echo "final job status:"
      echo "${response}" | jq .
      return 0
    fi

    sleep 1
    attempt=$((attempt + 1))
  done

  echo "job did not finish within the polling window"
  return 1
}

cmd_help() {
  cat <<'HELP'
Usage:
  run.sh baseline-observe
  run.sh baseline-load [count] [concurrency]
  run.sh relief-observe
  run.sh relief-load [count] [concurrency]

Examples:
  run.sh baseline-observe
  run.sh baseline-load 12 4
  run.sh relief-observe
  run.sh relief-load 24 8
HELP
}

cmd_baseline_observe() {
  echo "=== baseline-observe (synchronous pain) ==="
  body_file="$(mktemp)"
  request_id="baseline-observe-$(date +%s)-$$"

  metrics="$(post_task "${BASELINE_URL}" "${request_id}" "${body_file}")"
  code="$(echo "${metrics}" | awk '{print $1}')"
  total_time="$(echo "${metrics}" | awk '{print $2}')"

  echo "status=${code} total_time_s=${total_time}"
  echo "response:"
  cat "${body_file}" | jq .

  rm -f "${body_file}"
}

cmd_baseline_load() {
  count="${1:-12}"
  concurrency="${2:-4}"
  echo "=== baseline-load (synchronous pain) count=${count} concurrency=${concurrency} ==="
  run_load "baseline" "${BASELINE_URL}" "${count}" "${concurrency}" "0"
}

cmd_relief_observe() {
  echo "=== relief-observe (queue-based) ==="
  body_file="$(mktemp)"
  request_id="relief-observe-$(date +%s)-$$"

  metrics="$(post_task "${RELIEF_URL}" "${request_id}" "${body_file}")"
  code="$(echo "${metrics}" | awk '{print $1}')"
  total_time="$(echo "${metrics}" | awk '{print $2}')"

  echo "status=${code} total_time_s=${total_time}"
  echo "enqueue response:"
  cat "${body_file}" | jq .

  job_id="$(jq -r '.jobId // empty' "${body_file}")"
  rm -f "${body_file}"

  if [ -n "${job_id}" ]; then
    wait_for_job "${job_id}"
  else
    echo "no jobId returned; cannot poll status"
    return 1
  fi
}

cmd_relief_load() {
  count="${1:-24}"
  concurrency="${2:-8}"
  echo "=== relief-load (queue-based) count=${count} concurrency=${concurrency} ==="
  run_load "relief" "${RELIEF_URL}" "${count}" "${concurrency}" "1"
}

command="${1:-help}"
shift || true

case "${command}" in
  help|-h|--help)
    cmd_help
    ;;
  baseline-observe)
    cmd_baseline_observe "$@"
    ;;
  baseline-load)
    cmd_baseline_load "$@"
    ;;
  relief-observe)
    cmd_relief_observe "$@"
    ;;
  relief-load)
    cmd_relief_load "$@"
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    cmd_help
    exit 1
    ;;
esac
