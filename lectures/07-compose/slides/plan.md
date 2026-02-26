Yes. A strong 75-minute format is a progressive demo where you start with one Express app and add one service at a time, using Compose commands as the need appears.

**Recommended Lecture Structure (75 min)**

1. **0-10 min: Why Compose + mental model**

- Containers vs images vs services
- `docker compose` (v2) vs `docker run`
- Show final architecture you’ll build: `web` (Express), `api` (Express), `redis`, optional `worker`

2. **10-20 min: Single Express service in Compose**

- Create a tiny `api` (`GET /` returns JSON)
- Add `Dockerfile`
- Add minimal `compose.yaml` with one service
- Commands to teach:
  - `docker compose up --build`
  - `docker compose ps`
  - `docker compose logs -f api`
  - `docker compose down`

3. **20-35 min: Add a second Express service (`web`)**

- `web` calls `http://api:3000` (service-name DNS)
- Demonstrate inter-service networking (no custom network yet)
- Commands to teach:
  - `docker compose up`
  - `docker compose exec web sh`
  - `docker compose restart api`
- Key concept: service names become hostnames

4. **35-50 min: Add Redis for shared state**

- `api` stores a counter or visit count in Redis
- Show environment variables and `depends_on`
- Commands to teach:
  - `docker compose logs redis`
  - `docker compose exec redis redis-cli`
  - `docker compose stop redis` / `start redis`
- Key concept: multi-service state and failure behavior

5. **50-62 min: Volumes + rebuild workflow**

- Add a named volume (for Redis persistence or app uploads)
- Explain bind mount vs named volume (quickly)
- Commands to teach:
  - `docker compose down -v` (warning: deletes named volumes)
  - `docker compose build`
  - `docker compose up -d`
  - `docker compose images` (optional)

6. **62-72 min: “Developer/debug” commands roundup**

- Fast command tour with real examples:
  - `docker compose config` (validate/resolve config)
  - `docker compose run --rm api npm test` (or one-off command)
  - `docker compose pull` (if using base images)
  - `docker compose top` (optional)
- Emphasize when to use `exec` vs `run`

7. **72-75 min: Wrap-up + cheat sheet**

- Recap Compose workflow
- Common mistakes (wrong ports, stale volumes, forgetting rebuild)

---

## Best Demo App (simple but effective)

Use **two tiny Express apps + Redis**:

- `api` (Express)
  - `GET /hello` → `{ message: "hello" }`
  - `GET /count` → increments Redis counter
- `web` (Express)
  - `GET /` → fetches `api/hello` and `api/count`, returns combined HTML/JSON
- `redis`
  - official image, no custom code

Optional if time remains:

- `worker` (Node script) that logs something from Redis every few seconds

This gives you:

- service discovery
- ports
- env vars
- logs
- exec
- restart behavior
- persistence

---

## Commands to Cover (most important)

Prioritize these and show them in context:

- `docker compose up`
- `docker compose up --build`
- `docker compose up -d`
- `docker compose down`
- `docker compose down -v`
- `docker compose ps`
- `docker compose logs -f [service]`
- `docker compose exec <service> sh`
- `docker compose run --rm <service> <cmd>`
- `docker compose stop|start|restart <service>`
- `docker compose build`
- `docker compose config`

Nice-to-have (if time):

- `docker compose pull`
- `docker compose images`
- `docker compose top`

---

## Teaching Tips (important for live demo success)

- Prepare **checkpoint branches/tags** (`step1`, `step2`, `step3`) in case something breaks.
- Keep code tiny; spend time on **Compose behavior**, not Express coding.
- Use one terminal for `logs -f`, one for commands, one for browser/curl.
- Intentionally break one thing (wrong hostname/port) to show how `ps`, `logs`, and `exec` help debug.

If you want, I can also draft a **step-by-step repo layout** (`step0` to `step4`) with minimal Express files and a lecture-ready `compose.yaml` progression.
