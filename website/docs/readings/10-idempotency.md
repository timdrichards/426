# 10 Idempotency

This is the primary reading for the Idempotency lecture in COMPSCI 426. In the previous lecture, we looked at queue and worker decoupling: moving slow work off the request path, buffering bursts, and letting asynchronous workers handle jobs later. In this chapter, we focus on the correctness problem that appears immediately after that architectural improvement: retries and redelivery can cause the same logical job to run more than once.

This chapter is written for students who may be seeing distributed-systems failure behavior for the first time. You do not need prior experience with queues to follow it. We will start with the failure model, define idempotency precisely, and then walk into a practical Redis-based guard you can add to a worker.

If you remember one sentence from this chapter, remember this: once retries are possible, duplicate processing is normal, so handlers must be designed so repeated delivery does not repeat the business side effect.

## 1. Why This Topic Matters

Decoupling request handling from background work improves responsiveness and resilience, but it changes the kind of correctness problems your system has to solve.

When an API places a job on a queue, it is no longer the component that performs the business effect directly. A worker does that later. If the worker crashes, times out, loses its acknowledgement, or gets retried by the queueing system, the same logical job may be delivered again. That means duplicate processing is not a weird edge case. It is part of the normal operating environment of at-least-once systems.

Mini scenario: a user submits a request that should send exactly one confirmation email. The API enqueues the job successfully. The worker sends the email, but then crashes before recording that the job completed. The queue retries the job. Without an idempotency guard, the second attempt sends a second email even though the user only submitted once.

This lecture is about making those retries safe.

## 2. Core Vocabulary and Mental Model

We need a few precise terms before writing code.

A job is a unit of asynchronous work placed on a queue for later processing.

Delivery means the queue gives a worker a job to process.

Redelivery means the same logical job is delivered again, often after timeout, crash, or missing acknowledgement.

A side effect is an externally meaningful action caused by processing a job, such as sending an email, charging a payment method, writing an audit row, or updating another service.

An idempotency key is a stable identifier for the logical operation. In this lecture, that key is usually `jobId`.

Idempotency means that processing the same logical operation multiple times has the same final effect as processing it once.

Keep this distinction explicit:

- Duplicate delivery is a system behavior.
- Duplicate side effect is an application correctness failure.
- Idempotency is the design strategy that prevents the second problem even when the first still occurs.

## 3. What At-Least-Once Delivery Actually Means

Students often hear “at-least-once” and think it sounds reassuring. It is reassuring for eventual completion, but it carries a cost.

At-least-once delivery means the system tries hard not to lose work entirely. If success is uncertain, it may deliver the same job again. That makes retries a feature, not a bug. The downside is that the worker may see the same logical job more than once.

This is different from exactly-once processing, which is much harder to guarantee in real distributed systems. In practice, many production systems choose at-least-once delivery plus idempotent handlers because that combination is much more achievable.

So the design question becomes: if the same `jobId` arrives twice, how do we ensure the business outcome still behaves like “once”?

## 4. Where Duplicates Come From

The main failure window from the lecture is simple:

1. A worker receives a job.
2. The worker performs the side effect.
3. The worker crashes before recording completion or acknowledging safely.
4. The queue retries the job.

From the queue’s perspective, this retry is reasonable because success was not confirmed. From the business perspective, however, the side effect may already have happened.

Mini scenario: a worker inserts a shipping request into an external fulfillment system and then dies before updating its internal status table. A later retry performs the same insertion again. If the external system does not deduplicate the request, the customer may now have two shipments in progress.

The lesson is that a worker cannot treat “I am seeing this delivery now” as proof that the logical operation has not already been applied.

## 5. What Idempotency Means in Plain English

Idempotency is easier to understand through examples.

Setting a profile name to `"Alex"` is usually idempotent. Doing it once or doing it again leaves the same final state.

Charging a credit card twice is not idempotent. The second execution changes the result in a materially different way.

For this lecture, the rule is:

- Processing a job with `jobId = 123` multiple times should have the same final effect as processing it once.

That does not always mean “do nothing on repeats” in every possible system design. But in our worker pattern, it usually means the first processor claims the job and later duplicate deliveries are skipped before the side effect runs again.

## 6. Stable Keys Are the Foundation

An idempotency strategy only works if the key identifies the logical operation consistently.

In this lecture, `jobId` is the stable key. If the producer generates a new random key for every retry, then the worker cannot tell that the deliveries refer to the same logical job. In that case, the guard fails conceptually before any code runs.

Good idempotency keys have these properties:

- Stable across retries of the same logical operation.
- Unique across different logical operations.
- Available to the worker before it performs the side effect.

Common mistake: using a delivery-specific identifier instead of an operation-specific identifier. Delivery identifiers change as the queue retries. Idempotency keys should not.

## 7. Claim Before the Side Effect

The lecture’s practical strategy is straightforward:

1. Build a key such as `processed:<pipeline>:<jobId>`.
2. Attempt to claim it once.
3. Only the first successful claimant performs the side effect.
4. Later deliveries that fail to claim the key skip the side effect.

This pattern is effective because it places the duplicate check before the expensive or dangerous business action.

If you send the email first and only record “done” afterward, you are still vulnerable to the crash window. The ordering matters. Claim first, then perform the side effect.

## 8. Redis `SET NX` as an Idempotency Guard

In the lecture demo, Redis is used as the shared claim store. The core operation is:

```js
const claimed = await redis.set(lockKey, '1', { NX: true, EX: 86400 })
```

Read this carefully:

- `lockKey` is the idempotency key for the logical job.
- `NX: true` means “set only if the key does not already exist.”
- `EX: 86400` means the claim expires after 24 hours.

If `claimed` is truthy, this worker is the first processor and may continue.

If `claimed` is falsy, some earlier attempt already established the claim, so this delivery should be treated as a duplicate and skipped.

This is a good fit for distributed workers because Redis provides shared state across processes and containers. A local in-memory map would not be enough once multiple workers are involved.

## 9. Worker Example and Reasoning

The lecture’s example looks like this:

```js
async function processJobIdempotent(job) {
  const lockKey = `processed:${job.jobId}`
  const claimed = await redis.set(lockKey, '1', { NX: true, EX: 86400 })

  if (!claimed) {
    console.log('duplicate skipped', job.jobId)
    return
  }

  await sendEmail(job.payload)
  await db.insertJobAudit({ jobId: job.jobId, status: 'done' })
}
```

Code walkthrough notes:

The guard executes before `sendEmail`, which is the critical design choice. The worker does not ask “did I already finish?” after the side effect. It asks “am I the first allowed processor?” before the side effect.

The duplicate path is explicit. Logging `duplicate skipped` is important because silent skipping can make debugging difficult during demos, testing, and production incidents.

The audit write happens after the side effect in this simplified example. In a production system, you would think carefully about how audit state, external effect state, and claim state relate so that your observability reflects real outcomes accurately.

## 10. TTL Is a Correctness Decision, Not Just Cleanup

Students often think the expiration time is just a housekeeping value. It is more important than that.

The TTL should align with the retry horizon of the system and the business risk of duplicate execution.

If the TTL is too short, the claim may expire while retries are still possible. A later redelivery could then claim the key again and repeat the side effect.

If the TTL is too long, duplicate protection lasts longer, but stale keys accumulate and legitimate future reuse of the same key becomes harder.

This is why the lecture’s tradeoff table matters:

- Long TTL reduces duplicate side-effect risk.
- Short TTL reduces stale-key duration.

There is no universal correct TTL. It must come from system behavior and business requirements.

## 11. Observability: Prove the Guard Works

Idempotency is not something you should merely assume from code inspection. You should validate it empirically.

The lecture emphasizes comparing pipelines with and without the guard:

- `no-idem-observe` versus `idem-observe`
- `no-idem-load` versus `idem-load`

What should you expect?

- Similar submission counts.
- Fewer observed side effects in the idempotent version when duplicates occur.
- Explicit duplicate-skip logs in the guarded worker.

The practical test is not “did the worker run twice?” The practical test is “did the side effect happen more than once for the same `jobId`?”

That distinction is central. Duplicate processing attempts may still exist. Idempotency means those duplicate attempts do not create duplicate business outcomes.

## 12. Activity Goals and What to Check

In the activity, you add an idempotency guard to the worker and then verify behavior under repeat delivery.

Your implementation goals are:

1. Use `jobId` as the idempotency key.
2. Add a Redis `SET NX` claim guard.
3. Log duplicate skips clearly.

Your verification goals are:

1. Side effects execute once per unique `jobId`.
2. Repeat attempts are skipped.
3. Under load, total effects trend toward the number of unique jobs rather than the number of total deliveries.

This is a good example of correctness testing in distributed systems. You are not only testing return values. You are testing the relationship between submissions, retries, and externally visible effects.

## 13. Tradeoffs and Limits of This Pattern

The Redis claim-guard pattern is practical and widely useful, but it is not magic.

It introduces extra state and extra logic. You now have to manage key design, TTL selection, and operational visibility.

It also does not remove every possible failure mode. For example, if the side effect succeeds and your system later needs a durable historical record, a temporary Redis key alone may not be enough for long-term reconciliation or audit requirements.

You should also remember that “skip duplicates” only works if repeated deliveries truly refer to the same logical operation. If your producer generates bad keys or the business event itself is ambiguous, the worker cannot fix that ambiguity on its own.

So the pattern is powerful, but it depends on disciplined key semantics and system-wide thinking.

## 14. Production Checklist

Before treating a worker as safely idempotent, ask these questions:

- What exactly is the stable idempotency key?
- Is that key preserved across retries?
- Does the worker claim before the side effect?
- Is the TTL consistent with the real retry window?
- Are `processed` and `duplicate-skipped` logged separately?
- Do dashboards compare effect count against submission count?
- Have crash and restart windows been tested intentionally?

These questions turn idempotency from a code snippet into an operational practice.

## 15. Final Takeaway

Decoupling improves performance and resilience, but it moves correctness pressure into asynchronous processing. In an at-least-once system, duplicate delivery is expected. The worker must therefore be safe under repeated attempts.

The main design idea from this chapter is simple:

- identify the logical operation with a stable key
- claim that key exactly once before the side effect
- skip later deliveries of the same operation

If you can show that one `jobId` leads to one business side effect even when the queue retries, then you have implemented the core idea of idempotency correctly.
