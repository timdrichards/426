#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/05-health-check.cast

# Commands to run during recording:
# Assumes the container is running and mapped to host port 3000.
curl http://localhost:3000/health
