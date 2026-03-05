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

# 10 Idempotency Activity Starter

This starter is for the idempotency activity.

Current state:

- API already enqueues jobs and returns `202`
- Worker consumes jobs from Redis queue
- Worker currently applies side effects on every delivery (no idempotency guard yet)

Your task is to add idempotency and prove duplicate side effects are prevented.

## Start

```bash
cd website/website/docs/lectures/10/code/activity-2
docker compose up --build
```

## Run duplicate test (no host curl needed)

```bash
docker compose run --rm demo duplicate-observe
docker compose run --rm demo duplicate-load 8 2
```

Before idempotency, side effects should be close to duplicate submissions.
After idempotency, side effects should be close to unique jobs.

## Suggested implementation target

Edit `worker/worker.js`:

1. Use `jobId` as idempotency key
2. Add Redis `SET processed:<jobId> 1 NX EX ...`
3. If claim fails, skip side effect and log `duplicate skipped`

## Watch logs

```bash
docker compose logs -f worker
```

## Stop

```bash
docker compose down
```
