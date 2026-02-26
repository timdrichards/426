#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/11-processes-stats.cast

# Commands to run during recording:
docker top scheduler-guide
docker stats scheduler-guide
