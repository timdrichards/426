#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/06-lifecycle-stop-start-remove.cast

# Commands to run during recording:
# Assumes container name is scheduler-guide.
docker stop scheduler-guide
docker start scheduler-guide
docker rm -f scheduler-guide
