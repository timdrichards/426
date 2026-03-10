---
theme: default
background: https://cover.sli.dev
title: 09 Decoupling
info: |
  ## 09 Decoupling
  Workers, queues, and async processing
class: text-center
drawings:
  persist: false
transition: fade
mdc: true
duration: 75min
lineNumbers: true
highlighter: shiki
routerMode: hash
---

# 09 Decoupling

<div class="text-2xl opacity-70 mt-6">
Move slow and failure-prone work off the request path
</div>

---
class: text-2xl
---

# Class Format (Experiential)

Today is a tutorial-style class:

- Demo 1: synchronous pain points
- Mini-lecture 1: Redis queue primer (mental model + operations)
- Activity 1 (10 min): add queue + worker
- Debrief + mini-lecture 2: failure isolation and reliability patterns
- Reliability checks: backlog + worker downtime
- Wrap-up: connect architecture to reliability tradeoffs

---
class: text-xl
layout: two-cols 
layoutClass: gap-12
---

# Outcomes

By end of class, you should be able to:

- Introduce a dedicated background worker
- Use queue-based producer/consumer communication
- Isolate request-path failures from async job failures
- Explain decoupling tradeoffs (latency, isolation, and operational complexity)

::right::

```mermaid
flowchart TD
  U[Client] --> API[API]
  API --> Q[(Queue)]
  Q --> W[Worker]
  W --> DB[(DB/Side effect)]
```

---
class: text-2xl
---

# Where We Left Off

Last lecture (resilience):

- health/readiness
- retries/backoff
- startup stability

Today adds a new layer:

- even if startup is healthy, request latency and coupling can still be bad
- decoupling lets the API stay responsive while work happens asynchronously

---
class: text-xl
layout: two-cols-header
layoutClass: gap-x-12 gap-y-0 no-wrap-header cols-50-50
---

# Previous System (Before Decoupling)

::left::

In the previous version, everything lived in one program:

- the API endpoint and work logic ran in the same Node process
- when a request came in, that same process did slow side-effect work immediately
- if the side-effect code failed, the request failed too

**Simple way to think about it:**
- one app, one runtime, one failure domain

::right::

<div class="min-h-[380px] grid place-items-center scale-155">

```mermaid
flowchart LR
  C[Client Request] --> P["Single Node Program"]
  subgraph P1 [Inside Same Program]
    A["API Handler<br>POST /tasks"]
    W["Slow Work Logic<br>email/webhook/etc."]
  end
  A --> W
  W --> R[HTTP Response]
```

</div>

---
class: text-2xl
layout: two-cols-header
layoutClass: gap-10 no-wrap-header
---

# Before vs After

::left::

### **Before (coupled)**

- `POST /tasks` does everything inline
- request waits for slow I/O
- worker logic crash == request failure

::right::

### **After (decoupled)**

- `POST /tasks` enqueues job, returns quickly
- worker consumes jobs independently
- worker crash does not crash request path

---
class: text-2xl
---

# Demo 1: The Coupled Baseline

Goal: feel the pain before we fix it.

**Demo behavior:**

- request handler sleeps or does slow dependency call
- occasional failure inside that work
- client sees high latency and intermittent 500s

**Question before we run it:**

- If this endpoint gets 20 concurrent requests, what happens to user experience?

---
class: text-xl code-size-sm
---

# Demo 1 Code: Inline Work in API

```js
app.post('/tasks', async (req, res) => {
  try {
    const task = req.body

    // Simulate slow side effect (email, invoice, webhook, etc.)
    await doSlowWork(task) // 2-4 seconds, sometimes throws

    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'task failed inline' })
  }
})
```

**Why this is fragile:**

- user waits for slow work
- transient side-effect failures become request failures

---
class: text-2xl
---

# Demo 1 Commands

Use the mini-lecture stack (no host `curl` required):

- `cd website/docs/lectures/09/code/mini-lecture-1`
- `docker compose up --build -d`
- `docker compose run --rm demo baseline-observe`
- `docker compose run --rm demo baseline-load 12 4`

Then compare relief:

- `docker compose run --rm demo relief-observe`
- `docker compose run --rm demo relief-load 24 8`
- `docker compose logs -f worker`

---
class: text-2xl
---

# Command Walkthrough: Setup

Command:

- `cd website/docs/lectures/09/code/mini-lecture-1`

What it does:

- moves your shell into the demo folder
- ensures all following `docker compose` commands use the right stack

Setup in that folder:

- `api-baseline` on port `3000` (inline slow work)
- `api-relief` on port `3002` (queue + fast `202`)
- `worker` + `redis`
- `demo` runner service for curl/load commands

---
class: text-2xl
---

# Command Walkthrough: Start Services

Command:

- `docker compose up --build -d`

What it does:

- builds images from local `api/`, `worker/`, and `demo-runner/`
- starts containers in detached mode
- initializes Redis and network wiring between services

What to verify:

- no container exits immediately
- services are reachable before running demo commands

---
class: text-2xl
---

# Command Walkthrough: Baseline Observe

Command:

- `docker compose run --rm demo baseline-observe`

What it does:

- runs one POST request against `api-baseline`
- prints HTTP status + request latency + JSON response

What to notice:

- latency is usually multi-second
- result can be `201` or `500` depending on simulated failure
- this is the synchronous pain case

---
class: text-2xl
---

# Command Walkthrough: Baseline Load

Command:

- `docker compose run --rm demo baseline-load 12 4`

What it does:

- sends 12 baseline requests with concurrency 4
- summarizes status counts and latency stats

How to read output:

- higher `latency_avg_s` shows request-path blocking
- `status_500` indicates transient side-effect failures leaking to clients

---
class: text-2xl
---

# Command Walkthrough: Relief Observe

Command:

- `docker compose run --rm demo relief-observe`

What it does:

- sends one POST to `api-relief` (queued mode)
- API enqueues and quickly returns `202` with a `jobId`
- demo then polls job status to show async completion

What to notice:

- request latency should be near-instant compared to baseline
- work still happens, but outside request path

---
class: text-2xl
---

# Command Walkthrough: Relief Load

Command:

- `docker compose run --rm demo relief-load 24 8`

What it does:

- sends 24 requests with concurrency 8 to queued API
- reports response latency and accepted jobs
- shows queue depth after enqueues

What to notice:

- responses stay fast (`202`) under burst
- backlog moves to queue instead of user-facing latency

---
class: text-2xl
---

# Command Walkthrough: Worker Logs

Command:

- `docker compose logs -f worker`

What it does:

- streams worker processing logs in real time
- shows queued jobs being drained and processed

What to connect:

- API latency is now decoupled from side-effect runtime
- this is the core architecture shift: request path vs async work path

---
class: text-2xl
layout: two-cols-header
layoutClass: gap-10 no-wrap-header
---

# Demo 1 Debrief

::left::

<Callout title="Main takeaway" tone="warning">
Fast API responses and slow side effects do not belong in the same failure domain.
</Callout>

::right::

What we observed:

- slow work inflated response time
- request success depended on side-effect timing
- retries and failures now have an explicit queue boundary to absorb pressure

---
class: text-2xl
layout: two-cols-header
layoutClass: gap-10 no-wrap-header
---

# Mini Lecture 1: Communication Models

::left::

### **Synchronous (request/response)**

- API calls dependency inline
- caller waits for full completion
- one slow dependency stretches user latency
- failure propagates directly to caller

::right::

### **Queue-based (producer/consumer)**

- API enqueues a job, returns fast
- worker processes job separately
- queue buffers bursts and downtime
- request path and work path fail independently

---
class: text-xl
---

# Synchronous Path (Coupled Timeline)

<div class="w-3/4 mx-auto">

```mermaid
sequenceDiagram
  participant C as Client
  participant A as API
  participant S as Slow Service

  C->>A: POST /tasks
  A->>S: doSlowWork(task)
  S-->>A: success/failure
  A-->>C: 201 or 500 (after waiting)
```

</div>

- User latency includes slow side effect.
- Side-effect failure becomes request failure.

---
class: text-xl
---

# Queue Path (Decoupled Timeline)

<div class="w-2/3 mx-auto">

```mermaid
sequenceDiagram
  participant C as Client
  participant A as API (Producer)
  participant Q as Redis Queue
  participant W as Worker (Consumer)

  C->>A: POST /tasks
  A->>Q: LPUSH jobs <job>
  A-->>C: 202 Accepted
  W->>Q: BRPOP jobs 0
  Q-->>W: <job>
  W->>W: process side effect
```

</div>

- Fast response to client.
- Slow/failed work handled off request path.

---
class: text-2xl 
layout: two-cols-header
layoutClass: mt-gap-4 gap-x-12
---

# Redis Queue Basics (Lists)

We will use one Redis list key: `jobs`.

::left::

**Core Operations:**

- `LPUSH jobs <json>` -> add a new job
- `BRPOP jobs 0` -> blocking pop from queue (wait forever)
- `LLEN jobs` -> queue depth
- `LRANGE jobs 0 -1` -> inspect current queue items

::right::

**FIFO Pattern Used in Class:**

- producer uses `LPUSH`
- worker uses `BRPOP`
- oldest item is consumed first

---
class: text-xl code-size-sm
---

# Redis CLI Queue Demo

```bash
# 1) Enter Redis CLI in compose
docker compose exec redis redis-cli

# 2) Enqueue two jobs
LPUSH jobs '{"jobId":"1","task":"email"}'
LPUSH jobs '{"jobId":"2","task":"email"}'

# 3) Inspect queue
LLEN jobs
LRANGE jobs 0 -1

# 4) Consume one job (blocks until available)
BRPOP jobs 0
```

What to notice:

- Queue stores plain strings.
- Your app serializes/deserializes JSON.

---
class: text-xl code-size-sm
---

# Node + Redis Queue Operations

```js
import redis from 'redis'

const client = redis.createClient({ url: 'redis://redis:6379' })
await client.connect()

// Producer
await client.lPush('jobs', JSON.stringify(job))

// Consumer (blocking)
const result = await client.brPop('jobs', 0)
const job = JSON.parse(result.element)
```

**Implementation rule for today:**

- API file only enqueues and returns `202`
- worker file only dequeues and processes jobs

---
layout: two-cols-header
layoutClass: gap-8 compact-header
class: text-lg
---

## Activity 1 (10 minutes): Introduce Queue + Worker

::left::

**Work in pairs. Keep your current app, then:**

1. Add a queue (Redis list is fine).
2. Change `POST /tasks` to enqueue only.
3. Return `202 Accepted` with a `jobId`.
4. Add a `worker` process that consumes and processes jobs.

Use folder: `website/docs/lectures/09/code/activity-1`

::right::

**Minimum behavior to show:**

- API returns quickly even when work is slow.
- Worker logs job processing separately.
- If worker is stopped, API can still enqueue.

Checkpoint command set:

- `docker compose up -d --build`
- `docker compose logs -f api worker`

**A more complete description of the activity is available with the activity assignment.**

---
class: text-2xl
---

# Activity 1 Hints

Possible Redis queue commands:

- enqueue: `LPUSH jobs <json>`
- consume: `BRPOP jobs 0`

Minimal API response shape:

```json
{ "accepted": true, "jobId": "abc123", "status": "queued" }
```

If stuck, implement these two files first:

- `api/server.js` enqueue endpoint
- `worker/worker.js` consumer loop

---
class: text-center
---

# Activity 1 Work Time

<ActivityCountdown
  :minutes="15"
  label="15-minute countdown"
  goal="Goal: API returns 202, worker consumes queue, and behavior improves under load."
/>

---
class: text-2xl
---

# Debrief: What Changed Architecturally?

```mermaid
flowchart LR
  C[Client] --> A[API]
  A -->|LPUSH| Q[(Redis jobs)]
  W[Worker] -->|BRPOP| Q
  W --> S[Slow side effects]
```

- API became a producer.
- Worker became a consumer.
- Queue became the boundary between request path and async work.

---
class: text-2xl
---

# Mini Lecture: Queue Patterns

Core pattern terms:

- **Producer**: creates jobs and enqueues
- **Consumer/Worker**: dequeues and processes
- **Backlog**: queued work waiting to be processed
- **Retry strategy**: when processing fails

Important truth:

- Decoupling improves user-facing reliability but adds operational complexity.

---
class: text-2xl code-size-sm
---

# Live Coding Pattern: API as Producer

```js
app.post('/tasks', async (req, res) => {
  const jobId = crypto.randomUUID()
  const job = { jobId, type: 'send-email', payload: req.body }

  await redis.lPush('jobs', JSON.stringify(job))

  res.status(202).json({
    accepted: true,
    jobId,
    status: 'queued',
  })
})
```

Design note:

- `202` means accepted for async processing, not completed.

---
class: text-xl
---

# Live Coding Pattern: Worker as Consumer

```js
while (true) {
  const result = await redis.brPop('jobs', 0)
  const raw = result?.element
  if (!raw) continue

  const job = JSON.parse(raw)
  await processJob(job)
  console.log('processed', job.jobId)
}
```

This loop is simple, but the hard part is failure behavior.

---
class: text-2xl code-size-sm
---

# Compose Update (Worker Service)

```yaml
services:
  api:
    build: ./api
    depends_on:
      redis:
        condition: service_healthy

  worker:
    build: ./worker
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
```

Now API and worker can fail/restart independently.

---
class: text-xl
---

# Reliability Check: Worker Downtime + Backlog

Use folder: `website/docs/lectures/09/code/mini-lecture-1`

Run this sequence:

1. `docker compose up --build -d`
2. `docker compose stop worker`
3. `docker compose run --rm demo submit-burst 12 4`
4. `docker compose start worker`
5. `docker compose logs -f worker`

**Expected observation:**

- API still accepts and queues while worker is stopped
- backlog drains after worker restart

---
class: text-2xl
layout: two-cols-header
layoutClass: gap-12 no-wrap-header gap-x-12 gap-y-0
---

# Failure Isolation: What Broke vs What Stayed Healthy

::left::

**When worker is down:**

1. API can still accept requests
2. queue depth increases
3. processing latency shifts to backlog
4. user-facing latency stays low

::right::

**Consequence:**

- request path and processing path fail independently
- this is the main decoupling benefit

<Callout class="mt-4" title="Design implication" tone="warning">
Queues buffer failure and burst pressure, but you still need monitoring and recovery playbooks.
</Callout>

---
layout: two-cols-header
layoutClass: gap-8 compact-header
class: text-lg
---

## Activity 1 Extension (10 minutes): Failure Isolation Drill

::left::

Run this drill:

1. Stop the worker.
2. Send a burst of API requests.
3. Restart worker and confirm backlog drains.

Use folder: `website/docs/lectures/09/code/activity-1`

Then explain what changed in each layer (API, queue, worker).

::right::

Verify:

- API still returns quickly while worker is down
- queue depth grows during downtime
- worker drains jobs after restart

Suggested commands:

- `docker compose stop worker`
- `docker compose run --rm demo submit-burst 10 4`
- `docker compose start worker`
- `docker compose logs -f worker`
- `docker compose exec redis redis-cli LLEN jobs`

---
class: text-2xl
---

# Quick Share-Out

With your partner, answer:

1. What changed when worker was down?
2. What evidence showed queue buffering worked?
3. What tradeoff did decoupling introduce?

Be ready to show one terminal output snippet.

---
class: text-2xl
---

# Tradeoff Table

| Design choice | Benefit | Cost |
| --- | --- | --- |
| Inline sync processing | Simple control flow | Latency + coupled failures |
| Queue + worker | Fast requests + isolation | More moving parts |
| Queue buffering under downtime | Better service continuity | Backlog management required |

---
class: text-2xl
---

# Recap

Today you practiced:

- introducing a dedicated worker
- queue-based producer/consumer communication
- isolating request path from async failures
- handling worker downtime with queue buffering

If you can explain why `202 + queue + worker` is safer than inline side effects, you got the core idea.

---
class: text-2xl
---

# The End

Until Next Time...
