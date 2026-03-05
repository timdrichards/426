---
id: ica-09
title: 'In-Class Activity 09'
sidebar_position: 1
slug: /assignments/ica/ica-09
releaseDate: '2026-03-05'
dueDate: '2026-03-05'
---

# In-Class Activity 09 - Decoupling

## Overview

This class is about decoupling slow, failure-prone work from the request path.

You will complete two connected activities:

1. **Activity 1**: move from synchronous inline processing to queue-based worker processing.
2. **Activity 2**: make queue processing safe under duplicate delivery by adding idempotency.

Why this matters in real systems:

- user-facing APIs should stay fast under burst traffic
- async workers isolate failures from request/response traffic
- retries and at-least-once delivery are common in distributed systems
- idempotency prevents duplicate business side effects (double email, double charge, etc.)

You will use Docker Compose and built-in demo runner containers, so you do **not** need `curl` installed locally.

## Project Structure

Lecture 09 code is organized under `code/09-decoupling`:

- `activity-1/`: starter for queue + worker decoupling
- `activity-2/`: starter for idempotency implementation
- `mini-lecture-1/`: instructor demo stack (pain vs relief)
- `mini-lecture-2/`: instructor demo stack (duplicates vs idempotency)

For this assignment, focus on:

- `code/09-decoupling/activity-1`
- `code/09-decoupling/activity-2`

## Testing Scripts (Container-Based)

Each activity includes a `demo` service in `compose.yml` that runs testing scripts from inside a container.

General pattern:

```bash
docker compose run --rm demo <command>
```

### Activity 1 demo commands

Run from `code/09-decoupling/activity-1`:

- `baseline-observe`
  - sends one request and prints status/latency/JSON
  - useful for seeing synchronous pain in starter state
- `baseline-load [count] [concurrency]`
  - sends many requests and summarizes latency + status distribution
- `submit-burst [count] [concurrency]`
  - sends a burst of requests (useful during worker-stop tests)
- `queue-observe`
  - expects your Activity 1 implementation (`202` + queued response)
- `queue-load [count] [concurrency]`
  - load test for your queued implementation
- `help`
  - prints command usage

### Activity 2 demo commands

Run from `code/09-decoupling/activity-2`:

- `duplicate-observe [job_id] [submissions]`
  - submits same `jobId` multiple times, then shows attempts/effects
- `duplicate-load [unique_jobs] [duplicates_per_job]`
  - sends duplicates in bulk, summarizes total side effects
- `poll-job <job_id>`
  - inspect one job/effect summary
- `help`
  - prints command usage

## Activity 1 - Queue + Worker Decoupling

### Goal

Convert the API from synchronous inline work to asynchronous queue-based processing:

- API becomes a producer
- Worker becomes a consumer
- Redis list is the queue boundary

### Starter behavior

In the starter, `POST /tasks` does slow work inline and may fail in the request path.

### Step 0: Start stack and observe baseline

```bash
cd code/09-decoupling/activity-1
docker compose up --build -d
docker compose run --rm demo baseline-observe
docker compose run --rm demo baseline-load 12 4
```

Expected baseline behavior:

- multi-second latencies
- possible `500` responses from inline simulated side-effect failures

### Step 1: Implement enqueue-only API behavior

Edit `api/server.js`.

Current TODO in file tells you where to change.

Implement:

- create/connect Redis client (use `REDIS_URL`)
- create job payload with `jobId`
- enqueue with Redis list (for example `LPUSH jobs <json>`)
- return `202 Accepted` quickly with a queued response body

Recommended response shape:

```json
{ "accepted": true, "status": "queued", "jobId": "..." }
```

### Step 2: Implement worker consumer loop

Edit `worker/worker.js`.

Implement:

- blocking pop loop from queue (for example `BRPOP jobs 0`)
- parse job payload
- process simulated side effect in worker
- log job lifecycle (`processing`, `done`, `failed`)

### Step 3: Validate decoupling behavior

```bash
docker compose up --build -d
docker compose logs -f api worker
```

Compare with queue-focused tests:

```bash
docker compose run --rm demo queue-observe
docker compose run --rm demo queue-load 12 6
```

What should improve:

- API returns quickly (`202`) under load
- worker handles slow work asynchronously
- request-path latency no longer tracks side-effect duration

### Step 4: Failure isolation check

```bash
docker compose stop worker
docker compose run --rm demo submit-burst 6 3
docker compose start worker
docker compose logs -f worker
```

Expected:

- API can still accept/enqueue while worker is stopped
- after worker restarts, backlog drains

### Activity 1 success criteria

You are done when:

- API endpoint no longer performs slow work inline
- API responds `202` for accepted jobs
- worker consumes from queue and processes jobs independently
- worker downtime does not immediately break request acceptance

## Activity 2 - Idempotency Under Duplicate Delivery

### Goal

Add idempotency to queue processing so repeated delivery of same `jobId` does not duplicate side effects.

### Starter behavior

In Activity 2 starter, worker processes duplicates multiple times by default (idempotency not implemented).

### Step 0: Start and observe duplicate problem

```bash
cd code/09-decoupling/activity-2
docker compose up --build -d
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
```

Interpretation:

- before idempotency, `observed_effects_total` should be near total submissions
- duplicate deliveries cause duplicate side effects

### Step 1: Implement idempotency guard in worker

Edit `worker/worker.js` (TODO section).

Implement logic like:

1. build idempotency key from `jobId` (for example `processed:<pipeline>:<jobId>`)
2. claim once using Redis `SET key 1 NX EX <ttl>`
3. if claim fails:
   - skip side effect execution
   - log duplicate skip
   - update job status/counters appropriately
4. if claim succeeds:
   - run side effect
   - mark completion

### Step 2: Re-test duplicate scenarios

```bash
docker compose up --build -d
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
docker compose logs -f worker
```

Expected after idempotency:

- one side effect per unique `jobId`
- repeated submissions are skipped, not re-executed
- in load test, `observed_effects_total` should trend toward `unique_jobs`

### Step 3: Optional Redis verification

```bash
docker compose exec redis redis-cli
KEYS 'processed:*'
```

### Activity 2 success criteria

You are done when:

- duplicate submissions of same `jobId` do not repeat side effects
- worker logs clearly show duplicate-skip events
- load test output demonstrates reduced side-effect count compared to baseline

## Deliverables

Submit all of the following:

1. **Activity 1 evidence**
   - screenshot or log snippet showing fast queued API responses (`202`)
   - screenshot or log snippet showing worker draining jobs
2. **Activity 2 evidence**
   - `duplicate-observe` output before and after idempotency (or equivalent proof)
   - `duplicate-load` output demonstrating reduction in side-effect count

## Cleanup

When finished:

```bash
cd code/09-decoupling/activity-1 && docker compose down
cd code/09-decoupling/activity-2 && docker compose down
```
