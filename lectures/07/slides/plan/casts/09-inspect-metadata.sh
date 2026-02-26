#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/09-inspect-metadata.cast

# Commands to run during recording:
docker inspect scheduler-guide --format '{{.State.Status}}'
docker inspect scheduler-guide --format '{{json .NetworkSettings.Ports}}'
