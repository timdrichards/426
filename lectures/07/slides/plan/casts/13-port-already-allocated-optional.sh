#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/13-port-already-allocated-optional.cast

# Commands to run during recording:
# Example: run when port 3000 is already in use
# docker run --name scheduler-guide --env-file .env -p 3000:3000 scheduler:guide
