#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/10-exec-into-container.cast

# Commands to run during recording:
# Assumes container name is scheduler-guide.
docker exec -it scheduler-guide sh

pwd
ls
cat package.json
ls dist
exit
