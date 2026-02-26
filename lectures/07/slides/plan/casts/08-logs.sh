#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/08-logs.cast

# Commands to run during recording:
# Assumes container name is scheduler-guide.
docker logs scheduler-guide
# or follow
# docker logs -f scheduler-guide
