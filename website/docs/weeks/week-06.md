---
title: 'Week 06'
sidebar_position: 6
---

# Week 06 - Resilience

## Overview

Week 06 focuses on resilience after the Compose baseline is already in place.

Lecture 6.8 extends the system with a real dependency (`redis`) to expose startup and recovery failure modes. Students implement `/healthz` and `/readyz`, add Compose `healthcheck` blocks, compare startup order versus actual readiness, and use bounded retry/backoff so transient dependency failures do not crash request handling.

Lecture 6.9 is the next step: moving asynchronous work into a dedicated worker with queue-based communication. This introduces failure isolation between the request path and background processing, plus practical idempotency concerns under at-least-once delivery behavior.

By the end of the week, students can diagnose startup fragility and apply concrete resilience patterns that keep multi-service systems stable.

## Learning Goals

By the end of this week, students should be able to:

- implement baseline resilience endpoints (`/healthz`, `/readyz`) and Compose health checks for observable startup behavior
- distinguish process startup from service readiness, including why startup order alone is not sufficient for reliability
- apply bounded retries with backoff to tolerate transient downstream failures and recover automatically
- explain why queue/worker patterns improve failure isolation for resilient systems
- reason about idempotency and at-least-once processing tradeoffs in async workflows

## Lecture 6.8: Resilience (Startup and Recovery)

In this lecture, we add `redis` as a dependency and focus on startup correctness plus recovery from transient failures. Students implement readiness signaling, monitor health transitions, inject failures (`restart redis`), and evaluate retry/backoff behavior under disruption.

- [Slides](pathname:///decks/08-resilience/index.html)
- [Notes](/docs/material-not-available)
- [Code](/code/08-resilience.zip)

## Lecture 6.9: Workers, Queues, and Failure Isolation

In this lecture, we introduce a dedicated background worker and queue-based communication so asynchronous tasks are decoupled from synchronous request handling. Students examine retry behavior in async pipelines, discuss at-least-once delivery implications, and apply idempotency patterns to avoid duplicate side effects.

- [Slides](/docs/material-not-available)
- [Notes](/docs/material-not-available)
- [Code](/docs/material-not-available)
