---
id: ica-10
title: 'In-Class Activity 10'
sidebar_position: 2
slug: /assignments/ica/ica-10
releaseDate: '2026-03-05'
dueDate: '2026-03-05'
---

# In-Class Activity 10 - Idempotency

## Starter Code

- [ica-10.zip](/code/ica-10.zip)

## Overview

This class focuses on correctness under duplicate delivery.

You will complete one activity:

1. **Activity**: make queue processing safe under duplicate delivery by adding idempotency.

Why this matters in real systems:

- retries and at-least-once delivery are common in distributed systems
- duplicate deliveries can duplicate business side effects (double email, double charge, etc.)
- idempotency prevents repeated side effects for the same logical job

You will use Docker Compose and built-in demo runner containers, so you do **not** need `curl` installed locally.

## Project Structure

Lecture 10 code is organized under `website/code/10-idempotency`:

- `activity-2/`: starter for idempotency implementation
- `mini-lecture-2/`: instructor demo stack (duplicates vs idempotency)

For this assignment, focus on:

- `website/code/10-idempotency/activity-2`

## Testing Scripts (Container-Based)

Activity includes a `demo` service in `compose.yml` that runs testing scripts from inside a container.

General pattern:

```bash
docker compose run --rm demo <command>
```

### Demo commands

Run from `website/code/10-idempotency/activity-2`:

- `duplicate-observe [job_id] [submissions]`
  - submits same `jobId` multiple times, then shows attempts/effects
- `duplicate-load [unique_jobs] [duplicates_per_job]`
  - sends duplicates in bulk, summarizes total side effects
- `poll-job <job_id>`
  - inspect one job/effect summary
- `help`
  - prints command usage

## Activity - Idempotency Under Duplicate Delivery

### Goal

Add idempotency to queue processing so repeated delivery of same `jobId` does not duplicate side effects.

### Starter behavior

In starter code, worker processes duplicates multiple times by default (idempotency not implemented).

### Step 0: Start and observe duplicate problem

```bash
cd website/code/10-idempotency/activity-2
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

### Success criteria

You are done when:

- duplicate submissions of same `jobId` do not repeat side effects
- worker logs clearly show duplicate-skip events
- load test output demonstrates reduced side-effect count compared to baseline

## Deliverables

Submit all of the following:

1. **Idempotency evidence**
   - `duplicate-observe` output before and after idempotency (or equivalent proof)
   - `duplicate-load` output demonstrating reduction in side-effect count
   - worker log snippet showing duplicate-skip behavior

## Cleanup

When finished:

```bash
cd website/code/10-idempotency/activity-2 && docker compose down
```
