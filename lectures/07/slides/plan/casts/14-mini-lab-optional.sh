#!/usr/bin/env bash
set -euo pipefail

# Record with:
# asciinema rec -q -c "bash --noprofile --norc" ../../public/casts/14-mini-lab-optional.cast

# Commands to run during recording (fast recap):
# docker build -t scheduler:lab .
# docker run --name scheduler-lab -p 3000:3000 scheduler:lab
# curl http://localhost:3000/health
# docker exec -it scheduler-lab sh
# docker logs -f scheduler-lab
# docker stop scheduler-lab
# docker rm scheduler-lab
# docker image rm scheduler:lab
