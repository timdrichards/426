---
id: ica-10
title: 'In-Class Activity 10'
sidebar_position: 2
slug: /assignments/ica/ica-10
releaseDate: '2026-03-05'
dueDate: '2026-03-05'
---

# In-Class Activity 10 - Idempotency Incident Response

## Starter Code

- [ica-10.zip](/code/ica-10.zip)

## Overview

Today you are the reliability team for a queue-based system that is misbehaving in production.

The API is accepting requests correctly. The worker is processing jobs correctly. The problem is that retries and duplicate delivery are causing the same logical job to trigger the same side effect multiple times.

Your mission in class is to:

1. reproduce the duplicate-side-effect bug,
2. patch the worker with an idempotency guard,
3. prove that one logical job now produces one side effect.

This is not a “read and discuss” activity. You should leave class having changed code, run the system, and gathered evidence that your fix works.

## Why This Is Interesting

This activity simulates a very real distributed-systems failure mode:

- the queue uses at-least-once delivery,
- retries are expected,
- duplicate delivery is normal,
- duplicate side effects are not acceptable.

Without idempotency, one user action can become two emails, two shipments, or two charges. Your job is to stop that from happening.

## What You Are Working With

Use the code in:

- `website/docs/lectures/10/code/activity-2`

Important pieces:

- `api/`
  - accepts requests and enqueues jobs
- `worker/worker.js`
  - consumes jobs and currently has the missing idempotency logic
- `demo-runner/run.sh`
  - provides containerized commands that generate duplicates and summarize the results
- `compose.yml`
  - starts Redis, API, worker, and the demo runner

## Class Scenario

Assume the product team filed this bug:

> “When the same job is retried, the system appears to apply the side effect multiple times. We need safe retries before this design can go to production.”

You are not rewriting the architecture. You are fixing the worker so retries become safe.

## Activity Flow

Work in pairs unless your instructor says otherwise.

Suggested timeline:

1. 5 minutes: start the stack and observe the bug
2. 10 minutes: implement the idempotency guard
3. 10 minutes: test and compare before/after behavior
4. 5 minutes: capture proof and be ready to explain your design

## Before You Start

From the repository root:

```bash
cd website/docs/lectures/10/code/activity-2
docker compose up --build -d
```

If the stack starts correctly, you should have:

- a Redis container,
- an API container,
- a worker container.

## Phase 1 - Reproduce the Bug

Your first job is to see the failure clearly.

Run:

```bash
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
```

What these commands do:

- `duplicate-observe`
  - submits the same `jobId` multiple times and shows one job’s attempts and effects
- `duplicate-load 8 2`
  - creates 8 unique jobs and submits each one twice

What you should notice before the fix:

- the worker processes the same logical job more than once,
- `observed_effects_total` is close to total submissions,
- duplicate delivery is causing duplicate side effects.

This is your baseline. Do not skip it. You need a clear before/after comparison.

## Phase 2 - Find the Right Place to Fix It

Open:

- `website/docs/lectures/10/code/activity-2/worker/worker.js`

Read `processJob(job)` carefully.

Notice the current behavior:

- the worker marks the job as processing,
- it increments process attempts,
- it always applies the side effect,
- it labels idempotency as `not-implemented`.

There is already a TODO comment showing the intended direction. Your job is to turn that into working logic.

## Phase 3 - Implement the Guard

Add idempotency to the worker so repeated delivery of the same `jobId` does not repeat the side effect.

Your implementation must do all of the following:

1. build a stable idempotency key from `jobId`
2. use Redis `SET ... NX EX ...` to claim the job once
3. skip the side effect if the claim fails
4. log that a duplicate delivery was skipped
5. update Redis job metadata so the job state reflects what happened

Recommended key pattern:

```txt
processed:<pipeline>:<jobId>
```

Recommended Redis operation:

```js
await client.set(processedKey(job.jobId), '1', { NX: true, EX: ttlSec })
```

### Your Design Goal

After your change:

- the first delivery of a `jobId` should apply the side effect,
- later duplicate deliveries of the same `jobId` should not apply it again.

### Important Constraint

The claim must happen before the side effect runs.

If you apply the side effect first and only record completion afterward, you have not fixed the duplicate-delivery problem.

## Phase 4 - Test Like an Engineer

After editing `worker/worker.js`, rebuild and rerun:

```bash
docker compose up --build -d
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
docker compose logs --tail=100 worker
```

What success looks like:

- one unique `jobId` produces one side effect,
- duplicate attempts are still visible as processing attempts,
- duplicate deliveries are skipped,
- `observed_effects_total` trends toward `unique_jobs`, not total submissions.

## Optional Deep Check

If you want to inspect the guard state directly:

```bash
docker compose exec redis redis-cli KEYS 'processed:*'
```

This helps verify that Redis is storing idempotency claims.

## Victory Conditions

You are done when you can demonstrate all of the following:

1. the worker no longer repeats the side effect for the same `jobId`
2. the worker logs show duplicate-skip behavior
3. your before/after test results clearly show the improvement
4. you can explain why `SET NX` solves the duplicate-delivery problem here

## What To Turn In

Submit evidence from class that shows your fix worked.

Include:

1. a short note describing your idempotency strategy
2. output from `duplicate-observe` before the fix
3. output from `duplicate-observe` after the fix
4. output from `duplicate-load 8 2` after the fix
5. a worker log snippet showing duplicate deliveries being skipped

## Fast Finishers

If you finish early, push the design a little further:

1. Explain what could go wrong if the TTL is too short.
2. Explain why `jobId` works as an idempotency key but a delivery-specific ID would not.
3. Change the duplicate test to use more submissions and predict the result before running it.
4. Identify what additional data you would log in production for debugging or dashboards.

## Cleanup

When class ends:

```bash
docker compose down
```
