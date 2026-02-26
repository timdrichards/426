#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/07-container-state.cast

# Commands to run during recording:
docker ps
docker ps -a
