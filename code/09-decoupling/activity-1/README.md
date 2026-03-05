# 09 Decoupling Activity 1 Starter

This starter matches the `slides/09-decoupling` hands-on activities.

## Start

```bash
cd code/09-decoupling/activity-1
docker compose up --build -d
```

## Baseline behavior right now

```bash
docker compose run --rm demo baseline-observe
docker compose run --rm demo baseline-load 12 4
```

Current behavior:

- `api` does slow work inline in the request path
- request can be slow and can fail
- `worker` is only a heartbeat stub for now

## Activity 1 target

Change code so:

- `POST /tasks` enqueues to Redis and returns `202`
- `worker` consumes queue jobs and processes them
- API remains responsive even if worker is stopped

Useful command:

```bash
docker compose logs -f api worker
```

After implementing queue mode, compare with:

```bash
docker compose run --rm demo queue-observe
docker compose run --rm demo queue-load 12 6
```

## Failure isolation demo

```bash
docker compose stop worker
docker compose run --rm demo submit-burst 6 3
docker compose start worker
docker compose logs -f worker
```

## Demo runner help

```bash
docker compose run --rm demo help
```
