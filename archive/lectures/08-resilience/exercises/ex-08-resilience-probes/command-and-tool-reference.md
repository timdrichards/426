# Resilience Lab Command and Tool Reference

This page covers every Docker Compose command and probe tool used in Lecture 08 resilience work (`web` + `api` + `redis`).

## Docker Compose Commands

### `docker compose up --build`
- What it is for: Build images and start services in foreground mode.
- Why use it: Reproduces startup timing and failure windows while logs stream directly.
- Example:
```bash
docker compose up --build
```

### `docker compose up -d --build`
- What it is for: Build and start services in detached mode.
- Why use it: Fast way to boot the full stack and keep terminal free for probes/logs.
- Example:
```bash
docker compose up -d --build
```

### `docker compose up -d redis`
- What it is for: Start only Redis service.
- Why use it: Isolate dependency startup behavior before starting `api`/`web`.
- Example:
```bash
docker compose up -d redis
```

### `docker compose up -d`
- What it is for: Start services using existing images.
- Why use it: Quick restart when code/images are already built.
- Example:
```bash
docker compose up -d
```

### `docker compose ps`
- What it is for: Show container status and health state.
- Why use it: First checkpoint to see `starting`, `healthy`, or `unhealthy` before deep debugging.
- Example:
```bash
docker compose ps
```

### `docker compose logs -f web api redis`
- What it is for: Follow live logs for all core services.
- Why use it: Correlate probe failures with exact restart/connect timing.
- Example:
```bash
docker compose logs -f web api redis
```

### `docker compose logs -f api`
- What it is for: Follow one service’s logs.
- Why use it: Narrow focus when `api` readiness is suspicious.
- Example:
```bash
docker compose logs -f api
```

### `docker compose restart redis`
- What it is for: Intentionally restart dependency.
- Why use it: Failure injection for resilience testing.
- Example:
```bash
docker compose restart redis
```

### `docker compose exec redis redis-cli`
- What it is for: Open Redis CLI inside running container.
- Why use it: Validate Redis directly (`PING`, `GET`, `INCR`) without network assumptions.
- Example:
```bash
docker compose exec redis redis-cli
```

### `docker compose exec <service> sh`
- What it is for: Open shell inside a service container.
- Why use it: Run local checks from container network perspective.
- Example:
```bash
docker compose exec api sh
```

### `docker compose exec api wget -qO- http://localhost:3000/readyz`
- What it is for: Probe API readiness from inside the API container.
- Why use it: Matches Compose health check behavior exactly.
- Example:
```bash
docker compose exec api wget -qO- http://localhost:3000/readyz
```

### `docker compose up -d --build web`
- What it is for: Rebuild/restart only web service.
- Why use it: Iterate on retry/backoff tuning quickly.
- Example:
```bash
docker compose up -d --build web
```

## Supporting Container Command

### `docker run --rm -it --network <project>_default redis:7-alpine redis-cli -h redis`
- What it is for: Launch temporary Redis CLI container on Compose network.
- Why use it: Useful when you do not want to exec into existing Redis container.
- Example:
```bash
docker run --rm -it --network resilience-08_default redis:7-alpine redis-cli -h redis
```

## Probe Tools

### `curl`
- What it is: CLI HTTP client for quick endpoint checks.
- What it is for: Verify health/readiness and capture status + body quickly.
- Why use it: Available almost everywhere; ideal for repeated probes during failures.
- Examples:
```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
curl http://localhost:3001
curl -i http://localhost:3000/readyz   # include HTTP status headers
```

### `wget`
- What it is: CLI downloader that can also perform HTTP probes.
- What it is for: Lightweight machine probes in containers and health checks.
- Why use it: Common in minimal images; simple non-interactive readiness test.
- Examples:
```bash
wget -qO- http://localhost:3000/readyz
wget -qO- http://api:3000/readyz
```

## Redis CLI Commands Used in Lab

### `PING`
- What it is for: Basic liveness check to Redis.
- Why use it: Fastest signal that Redis is reachable.

### `SET <key> <value>` / `GET <key>`
- What it is for: Store and retrieve known values.
- Why use it: Confirms reads/writes work, not just socket connectivity.

### `INCR <key>`
- What it is for: Increment counter atomically.
- Why use it: Matches this lab’s `visits` pattern used by `api`.

### `KEYS *`
- What it is for: List keys (small/dev datasets only).
- Why use it: Quick visibility while learning/debugging.

Examples:
```bash
PING
SET course cs426
GET course
INCR visits
GET visits
KEYS *
```

## Recommended Command Sequence During Incidents

```bash
docker compose ps
docker compose logs -f web api redis
curl -i http://localhost:3000/healthz
curl -i http://localhost:3000/readyz
curl -i http://localhost:3001
docker compose exec api sh
```

This order prevents random debugging and gives fast triage: container state -> logs -> probes -> in-container verification.
