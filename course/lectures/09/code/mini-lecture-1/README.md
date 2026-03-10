# Mini Lecture 1 Demo: Pain and Relief

This stack demonstrates synchronous pain vs queue-based relief using only Docker Compose.

## Services

- `api-baseline` (port `3000`): does slow side effects inline
- `api-relief` (port `3002`): enqueues jobs and returns fast (`202`)
- `worker`: consumes queued jobs and processes slow side effects
- `redis`: queue backend
- `demo`: curl-based scenario runner inside Docker (no host curl required)

## Start

```bash
cd website/website/docs/lectures/09/code/mini-lecture-1
docker compose up --build -d
```

## Observe the pain (synchronous)

```bash
docker compose run --rm demo baseline-observe
docker compose run --rm demo baseline-load 12 4
```

## Observe the relief (queue)

```bash
docker compose run --rm demo relief-observe
docker compose run --rm demo relief-load 24 8
```

## Watch async work happen

```bash
docker compose logs -f worker
```

## Redis queue inspection

```bash
docker compose exec redis redis-cli
LLEN jobs
LRANGE jobs 0 -1
```

## Help

```bash
docker compose run --rm demo help
```

## Stop

```bash
docker compose down
```
