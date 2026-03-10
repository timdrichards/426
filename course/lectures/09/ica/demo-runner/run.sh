#!/bin/sh
set -eu

API_URL="${API_URL:-http://api:3000}"
TIMEOUT_SEC="${DEMO_TIMEOUT_SEC:-20}"

post_task() {
  request_id="$1"
  body_file="$2"

  curl -sS --max-time "${TIMEOUT_SEC}" \
    -o "${body_file}" \
    -w "%{http_code} %{time_total}" \
    -X POST "${API_URL}/tasks" \
    -H 'content-type: application/json' \
    -d "{\"id\":\"${request_id}\"}"
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

run_load() {
  label="$1"
  request_count="$2"
  concurrency="$3"

  results_file="$(mktemp)"

  i=1
  while [ "${i}" -le "${request_count}" ]; do
    (
      request_id="${label}-${i}-$(date +%s)-$$"
      body_file="$(mktemp)"

      if metrics="$(post_task "${request_id}" "${body_file}")"; then
        code="$(echo "${metrics}" | awk '{print $1}')"
        total_time="$(echo "${metrics}" | awk '{print $2}')"
      else
        code="000"
        total_time="0"
      fi

      echo "${code} ${total_time}" >> "${results_file}"
      rm -f "${body_file}"
    ) &

    if [ $((i % concurrency)) -eq 0 ]; then
      wait
    fi

    i=$((i + 1))
  done

  wait
  summarize_http_results "${results_file}"
  rm -f "${results_file}"
}

cmd_help() {
  cat <<'HELP'
Usage:
  run.sh baseline-observe
  run.sh baseline-load [count] [concurrency]
  run.sh submit-burst [count] [concurrency]
  run.sh queue-observe
  run.sh queue-load [count] [concurrency]

Examples:
  run.sh baseline-observe
  run.sh baseline-load 12 4
  run.sh submit-burst 6 3
  run.sh queue-observe
  run.sh queue-load 12 6

Notes:
  - baseline commands work with starter code (inline API behavior).
  - queue commands are intended after Activity 1 changes (API returns 202).
HELP
}

cmd_baseline_observe() {
  request_id="baseline-observe-$(date +%s)-$$"
  body_file="$(mktemp)"

  metrics="$(post_task "${request_id}" "${body_file}")"
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
  run_load "baseline" "${count}" "${concurrency}"
}

cmd_submit_burst() {
  count="${1:-6}"
  concurrency="${2:-3}"
  run_load "burst" "${count}" "${concurrency}"
}

cmd_queue_observe() {
  request_id="queue-observe-$(date +%s)-$$"
  body_file="$(mktemp)"

  metrics="$(post_task "${request_id}" "${body_file}")"
  code="$(echo "${metrics}" | awk '{print $1}')"
  total_time="$(echo "${metrics}" | awk '{print $2}')"

  echo "status=${code} total_time_s=${total_time}"
  echo "response:"
  cat "${body_file}" | jq .

  if [ "${code}" != "202" ]; then
    echo "note: queue-observe expects Activity 1 changes (202 from API)."
  fi

  rm -f "${body_file}"
}

cmd_queue_load() {
  count="${1:-12}"
  concurrency="${2:-6}"
  run_load "queue" "${count}" "${concurrency}"
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
  submit-burst)
    cmd_submit_burst "$@"
    ;;
  queue-observe)
    cmd_queue_observe "$@"
    ;;
  queue-load)
    cmd_queue_load "$@"
    ;;
  *)
    echo "Unknown command: ${command}" >&2
    cmd_help
    exit 1
    ;;
esac
