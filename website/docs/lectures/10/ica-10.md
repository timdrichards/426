---
id: ica-10
title: 'In-Class Activity 10'
slug: /assignments/ica/ica-10
releaseDate: '2026-03-05'
dueDate: '2026-03-05'
kind: In-Class Activity
lateDaysAllowed: 0
isAssignment: true
assignmentType: in-class-activities
---

# 10 Idempotency Activity - Incident Response

## Overview

Today you are the reliability team for a queue-based system that is failing in a very realistic way.

The API accepts requests correctly. Jobs are reaching the queue. The worker is running. The problem is correctness: duplicate delivery is causing the same logical job to trigger the same side effect multiple times.

Your mission is to:

1. Reproduce the bug,
2. Patch the worker with an idempotency guard,
3. Prove that each logical job now produces only one side effect.

This is a hands-on activity. By the end of class, you should have modified the worker, rerun the system, and collected evidence that your fix works.

## Why This Matters

This activity models a core distributed-systems tradeoff:

- At-least-once delivery improves eventual completion,
- Retries are expected,
- Duplicate delivery is normal,
- Duplicate business side effects are not acceptable.

Without idempotency, one user action can become two emails, two shipments, or two charges. Your job is to make retries safe.

## Starter Code

- [ica-10.zip](/code/ica-10.zip)

Important files:

- `worker/worker.js`
  - this is where you will implement idempotency
- `demo-runner/run.sh`
  - this generates duplicate submissions and summarizes results
- `compose.yml`
  - this starts Redis, the API, the worker, and the demo tooling

## Class Scenario

Assume the product team filed this issue:

> “Under retries, the same job appears to apply its side effect multiple times. We need safe retries before this can go to production.”

You are not redesigning the whole system. You are fixing the worker so repeated delivery of the same `jobId` does not repeat the side effect.

## Suggested Timeline

1. 5 minutes: start the stack and reproduce the duplicate-effect bug
2. 10 minutes: implement the idempotency guard
3. 10 minutes: rerun the duplicate tests and compare results
4. 5 minutes: capture evidence and prepare to explain your approach

## Step 1 - Start the Stack

From inside the `ica-10` folder, run the following:

```bash
docker compose up --build -d
```

If startup succeeds, you should have running containers for:

- Redis
- API
- worker

Very that these containers are running.

## Step 2 - Reproduce the Problem First

Before you fix anything, observe the failure clearly.

Run:

```bash
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
```

Run them in that order and wait for `duplicate-observe` to finish before starting `duplicate-load`.

What these do:

- `duplicate-observe`
  - submits the same `jobId` multiple times and shows the attempts and effects for one job
- `duplicate-load 8 2`
  - creates 8 unique jobs and submits each one twice

Why run them sequentially:

- `duplicate-observe` is easier to interpret when the queue is otherwise quiet
- if you start the load test at the same time, the polling output becomes noisier and the simple before/after comparison is harder to read

What you should see before the fix:

- the same logical `jobId` is processed more than once,
- side effects are repeated,
- `observed_effects_total` is close to total submissions instead of unique jobs.

This is your baseline. Keep it, because you will compare your after-fix behavior against it.

## Step 3 - Inspect the Worker

Open the worker file:

```bash
worker/worker.js
```

Focus on the `processJob(job)` function.

Notice what the starter already does:

- marks a job as `processing`
- increments `processAttempts`
- applies the side effect
- records `idempotency: 'not-implemented'`

There is already a TODO in the file pointing toward the right implementation strategy.

## Step 4 - Add the Idempotency Guard

Implement idempotency so repeated delivery of the same `jobId` does not repeat the side effect.

Your implementation should:

1. build a stable idempotency key from `jobId`
2. attempt to claim that key using Redis `SET ... NX EX ...`
3. skip the side effect if the claim fails
4. log a duplicate-skip event
5. update job metadata so the stored state reflects what happened

Recommended key structure:

```txt
processed:<pipeline>:<jobId>
```

Recommended Redis operation:

```js
const claimed = await client.set(processedKey(job.jobId), '1', {
  NX: true,
  EX: ttlSec,
})
```

Interpretation:

- if `claimed` is truthy, this worker is the first processor and may continue
- if `claimed` is falsy, this delivery is a duplicate and should skip the side effect

## Critical Design Rule

Claim first. Then run the side effect.

If your code sends the email, writes the effect, or performs the external action before the claim check, you have not actually fixed the duplicate-delivery problem.

## Step 5 - Rebuild and Retest

After editing the worker, rebuild and rerun from the same folder that contains `compose.yml`:

```bash
docker compose up --build -d
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
docker compose logs --tail=100 worker
```

Again, wait for `duplicate-observe` to complete before you start `duplicate-load`.

What success looks like:

- one `jobId` produces one side effect,
- duplicate deliveries still increase process attempts,
- duplicate deliveries do not reapply the side effect,
- worker logs clearly show duplicate skips,
- `observed_effects_total` trends toward `unique_jobs`.

## Optional Redis Verification

If you want to inspect the claim keys directly:

```bash
docker compose exec redis redis-cli KEYS 'processed:*'
```

This is useful for confirming that Redis is storing the idempotency guard keys you expect.

## Victory Conditions

You are done when you can show all of the following:

1. duplicate submissions of the same `jobId` no longer repeat the side effect
2. worker logs show explicit duplicate-skip behavior
3. your before/after evidence clearly demonstrates improvement
4. you can explain why `SET NX` solves this problem in an at-least-once system

## What To Turn In

Be ready to submit or show:

1. a short explanation of your idempotency strategy
2. output from `duplicate-observe` before the fix
3. output from `duplicate-observe` after the fix
4. output from `duplicate-load 8 2` after the fix
5. a worker log snippet showing duplicate deliveries being skipped

## Fast Finishers

If you finish early, discuss or write short answers to these:

1. What can go wrong if the TTL is too short?
2. Why is `jobId` a good idempotency key here?
3. Why would a delivery-specific ID be a poor key?
4. What additional metrics or logs would you want in production?

## Stop the Stack

When finished, run this from the same folder that contains `compose.yml`:

```bash
docker compose down
```

If you want to remove everything created for this activity, including containers, networks, volumes, and built images, run:

```bash
docker compose down --volumes --rmi local
```
