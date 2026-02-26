#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/03-image-inventory.cast

# Commands to run during recording:
docker image ls
docker image ls scheduler:guide
