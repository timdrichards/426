---
id: exercise-6.8
title: 'Exercise 6.8'
sidebar_position: 1
slug: /assignments/exercises/exercise-6.8
releaseDate: '2026-03-03'
dueDate: '2026-03-10'
---

# Exercise 6.8 — Resilience Probe: Web + API + Redis

Exercises are guided practice for the lecture material. They are non-graded, but later graded assignments assume this work has been completed.

## System Diagram

![Web API Redis system diagram](./images/system-overview.png)

## Starter Code Download

- [Download Exercise 6.8 Starter Code](/code/exercise-6.8.zip)

## Why you are doing this (and why it matters later)

Lecture 08 introduces the core reliability distinction between process startup and service readiness. In real systems, dependencies restart and transient failures happen. This exercise practices designing `/healthz` and `/readyz`, observing Compose health states, and injecting failures so students can prove the system degrades gracefully and recovers without manual intervention.

This exercise makes us practice:

- use health and readiness endpoints for machine-readable service state
- interpret Docker Compose health transitions during boot and failures
- simulate dependency disruption and validate retry/backoff behavior
- collect evidence from logs and probes to locate the failing service

## Starting Instructions

1. Download the Exercise 6.8 starter code archive from the course site and extract it.
2. Open a terminal in the extracted folder that contains `compose.yml`.
3. Run `docker compose up -d --build` to build and start `web`, `api`, and `redis`.
4. Run `docker compose ps` and confirm all services are up before starting probes.
5. Keep a second terminal ready for logs with `docker compose logs -f web api redis`.

## Exercise Instructions

### Part A (10-15 min): Baseline Health and Readiness

1. Probe `api` with `curl http://localhost:3000/healthz` and `curl http://localhost:3000/readyz`.
2. Probe `web` with `curl http://localhost:3001` and record the response when the stack is healthy.
3. Capture one `docker compose ps` snapshot and identify health states (`starting`, `healthy`, or `unhealthy`).

### Part B (15-20 min): Inject and Observe Failure

1. Inject disruption using `docker compose restart redis`.
2. While Redis restarts, repeatedly run `curl http://localhost:3001` and `curl http://localhost:3000/readyz`.
3. Follow logs with `docker compose logs -f web api redis` and note exactly when symptoms begin and recovery occurs.
4. Describe whether failures are brief degradation (`503`) or persistent crash behavior.

### Part C (15-20 min): Tune Recovery Behavior

1. In `web/server.js`, change retry parameters in `withRetry` usage to `attempts = 6` and `baseMs = 200`.
2. Rebuild only web using `docker compose up -d --build web`.
3. Repeat the Redis restart experiment and compare user-visible failures before vs after tuning.
4. Write a short evidence-based conclusion about whether increased retry/backoff improved resilience.

## AI Assist Ideas (Optional)

AI use is allowed for this exercise.
Prompt log requirement: AI assistance is allowed, but you must log every prompt/response in `prompt-log.md` with tool name, exact prompt, and a short note describing how you used the result.

Suggested prompts (adapt to your exact code context):

1. `Explain the withRetry function and predict total worst-case wait time for 6 attempts with 200ms base delay.`
2. `Given the readyz handler in the API service, what false-positive readiness risks still exist?`
3. `I observed intermittent 503 responses after restarting Redis with Docker Compose. Suggest a debugging checklist focused on logs and probe sequencing.`

Target behavior:

- `/healthz` remains 200 while service processes are alive
- `/readyz` reflects dependency state and can return 503 during Redis outages
- `web` may briefly degrade during Redis disruption but should recover without manual restarts
- students can identify the offending dependency from probe outputs plus logs

## Saving Your Work

1. Save only the files you changed for this exercise in your extracted exercise folder.
2. Keep notes and timeline evidence in `exercise-notes.md` (or an equivalent text file).
3. Keep at least one screenshot of `docker compose ps` and your before/after retry comparison for class discussion.

## Verifying Your Work

1. Run `docker compose ps` and confirm healthy state after experiments complete.
2. Re-run curl checks for `http://localhost:3000/healthz`, `http://localhost:3000/readyz`, and `http://localhost:3001`.
3. Demonstrate that the stack recovers after `docker compose restart redis`.
4. Ensure your before/after comparison of retry settings is based on observed outputs, not assumptions.

## Solution Walkthrough

1. Compare your probe order against the lecture's observability sequence: `compose ps` -> `logs` -> endpoint probes -> in-container checks.
2. Review `web/server.js` and `api/server.js` from your downloaded exercise code to explain why behavior changed.
3. Use your timeline to justify which service was the initial source of failure and why.
