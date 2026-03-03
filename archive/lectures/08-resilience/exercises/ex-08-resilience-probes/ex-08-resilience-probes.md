# Exercise 8.1 — Resilience Probe Lab: Web + API + Redis (50-Minute Practice)

Exercises are guided practice for the lecture material. They are non-graded, but later graded assignments and tests assume this work has been completed.

Estimated total time: **50 minutes** (including reading this document).

## Course Context

- Course: CS 426
- Repository: /Users/richards/Git/426
- Branch: main

## Why you are doing this (and why it matters later)

Lecture 08 introduces the core reliability distinction between process startup and service readiness. In real systems, dependencies restart and transient failures happen. This exercise practices designing `/healthz` and `/readyz`, observing Compose health states, and injecting failures so students can prove the system degrades gracefully and recovers without manual intervention.

This exercise makes us practice:

- use health and readiness endpoints for machine-readable service state
- interpret Docker Compose health transitions during boot and failures
- simulate dependency disruption and validate retry/backoff behavior
- collect evidence from logs and probes to locate the failing service

References:

- Lecture source: lectures/08-resilience/slides/slides.md
- Code base: lectures/08-resilience/code
- Compose file: lectures/08-resilience/code/compose.yml

## Starting Instructions

1. Clone the course repository: `/Users/richards/Git/426`
2. Checkout branch `main`
3. Open `lectures/08-resilience/code` in your terminal.
4. Run `docker compose up -d --build` to build and start `web`, `api`, and `redis`.
5. Run `docker compose ps` and confirm all services are up before starting probes.
6. Keep a second terminal ready for logs with `docker compose logs -f web api redis`.

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

1. Stage only files changed for this exercise.
2. Commit with a message such as `exercise 8.1: resilience probes and failure analysis`.
3. Keep notes and timeline evidence in `exercise-notes.md` or equivalent.

## Verifying Your Work

1. Run `docker compose ps` and confirm healthy state after experiments complete.
2. Re-run curl checks for `http://localhost:3000/healthz`, `http://localhost:3000/readyz`, and `http://localhost:3001`.
3. Demonstrate that the stack recovers after `docker compose restart redis`.
4. Ensure your before/after comparison of retry settings is based on observed outputs, not assumptions.

## Solution Walkthrough

1. Compare your probe order against the lecture's observability sequence: `compose ps` -> `logs` -> endpoint probes -> in-container checks.
2. Review `lectures/08-resilience/code/web/server.js` and `lectures/08-resilience/code/api/server.js` to explain why behavior changed.
3. Use your timeline to justify which service was the initial source of failure and why.
