# Forensic Probing Playbook: Finding the Offending Service

Think like an incident investigator. Your job is not to guess. Your job is to build evidence, narrow suspects, and identify the service that caused failure first.

## Investigation Principles

- Start with timeline, not assumptions.
- Separate symptom service from root-cause service.
- Verify each claim with at least one command output.
- Use repeatable probe order so different people reach same conclusion.
- Track both process state (running) and readiness state (able to serve traffic).

## Service Map (Suspect Graph)

- User hits `web` on `localhost:3001`.
- `web` depends on `api` (`http://api:3000`).
- `api` depends on `redis` (`redis://redis:6379`).

If `web` fails, culprit may still be `api` or `redis`.

## Failure Signatures in This System

- `api /healthz = 200`, `api /readyz = 503`: API process alive, dependency not ready (often Redis).
- `web / = 503 dependency unavailable`: web cannot get a good upstream response after retries.
- Redis restarted and shortly after API readiness drops: likely dependency outage, not API code bug.
- Container `unhealthy` in `docker compose ps`: probe command is failing repeatedly.

## Step-by-Step Investigation Workflow

### Step 1: Establish Scene Status
```bash
docker compose ps
```
What to check:
- Are all three containers up?
- Which container is `starting` / `healthy` / `unhealthy`?

### Step 2: Build a Shared Timeline
```bash
docker compose logs -f web api redis
```
What to check:
- First error timestamp.
- Which service logged problems first.
- Did downstream services fail after upstream dependency events?

### Step 3: Probe Health vs Readiness
```bash
curl -i http://localhost:3000/healthz
curl -i http://localhost:3000/readyz
curl -i http://localhost:3001
```
Interpretation:
- `healthz=200` + `readyz=503` means API process is alive but not ready for traffic.
- `web=503` with API readiness failures usually means upstream dependency chain issue.

### Step 4: Inspect Dependency Directly
```bash
docker compose exec redis redis-cli
PING
INCR visits
GET visits
```
What to check:
- Does Redis respond immediately?
- Are read/write commands successful?

### Step 5: Validate In-Container Network Path
```bash
docker compose exec api wget -qO- http://localhost:3000/readyz
docker compose exec api sh
```
What to check:
- Does API report readiness from inside its own container?
- If needed, run more checks from inside container network context.

### Step 6: Controlled Failure Injection (Reproduce)
```bash
docker compose restart redis
```
Then repeat Steps 1-5 while collecting timestamps.

Goal:
- Confirm whether failures are transient and recoverable or persistent.
- Confirm offending service by seeing who fails first, not who reports last.

## Root-Cause Decision Tree

1. If `redis` unhealthy/unreachable first -> likely Redis root cause.
2. If Redis healthy but `api /readyz` fails -> likely API logic/config issue.
3. If API ready but web still fails -> likely web retry/upstream handling issue.
4. If all probes pass but user still reports issue -> inspect request path details and stale client/browser assumptions.

## Evidence Log Template

Use this template while investigating:

```md
# Incident Notes
- Time observed:
- Trigger action (if any):
- `docker compose ps` summary:
- First error log line (service + timestamp):
- `api /healthz` result:
- `api /readyz` result:
- `web /` result:
- Redis CLI results (`PING`, `INCR`, `GET`):
- Suspected offending service:
- Why (evidence-based):
- Fix applied:
- Post-fix verification:
```

## Fix Strategy by Offender

### Offender: Redis
- Check restart loops, resource pressure, or config issues.
- Keep API readiness dependent on actual Redis `PING` success.
- Allow temporary degradation and recovery instead of hard crash.

### Offender: API
- Confirm `REDIS_URL=redis://redis:6379` in Compose.
- Ensure `/readyz` checks real dependency path.
- Avoid reporting ready when dependency calls fail.

### Offender: Web
- Increase retry attempts/backoff for transient upstream outages.
- Return explicit 503 with context when upstream unavailable.
- Avoid permanent failure state after dependency recovers.

## Closure Checklist

- Root cause identified with command evidence.
- Fix applied to offending service.
- `docker compose ps` returns healthy steady state.
- Endpoint probes (`/healthz`, `/readyz`, `/`) pass as expected.
- Failure injection (`restart redis`) confirms graceful recovery.

A forensic workflow is successful when another investigator can replay your notes and reach the same conclusion.
