#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/04-run-container.cast

# Commands to run during recording:
cd /path/to/scheduling-app

docker run --name scheduler-guide --env-file .env -p 3000:3000 scheduler:guide
