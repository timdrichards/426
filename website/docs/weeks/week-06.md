---
title: 'Week 06 - Resilience'
sidebar_position: 6
---

# Week 06

## Overview

- Theme/topic: **Resilience**
- Lecture focus: **Compose networking and service readiness, then latency, timeouts, and retries**
- Lab/demo focus: **Two-service Node system, make it boot reliably, then make it behave under slow and flaky downstream**

## Learning Goals

By the end of this week, students should be able to:

- Explain how Docker Compose services communicate (DNS by service name, internal networks, internal vs host ports), and avoid the “localhost inside a container” mistake.
- Implement baseline production hygiene in a multi-service system: health endpoints, Compose healthchecks, and safe dependency handling (readiness vs startup order).
- Measure and reason about latency and failure on the request path, and apply timeouts plus bounded retries with backoff to prevent cascading failure.

## Agenda

### Class Meeting 1

- Warm-up / review:
  Quick recap of containers vs images, what Compose adds, and a 2-minute “predict what breaks” prompt for a two-service system.
- Main topic(s):
  - Compose networks and service discovery (service name DNS)
  - Internal vs external ports, what `ports` actually does
  - Configuration as contract (env vars)
  - Startup order vs readiness, why `depends_on` is not enough
  - Health endpoints and healthchecks
- Demo / worked example:
  - Demonstrate the localhost trap (calling `localhost` hits self)
  - Show `curl http://downstream:PORT/health` working from inside `api`
  - Add `/health` endpoints to both services
  - Add Compose healthchecks and show container health status changing
- Wrap-up / check for understanding:
  Exit ticket: students write three concrete reasons service-to-service calls fail in real systems, and map each to a mitigation (config, healthcheck, retry, timeout).

### Class Meeting 2 (Optional / If Applicable)

- Review / questions:
  Short Q and A on DNS naming, ports, and why readiness is a runtime property, not a startup property.
- Main topic(s):
  - Latency basics: critical path, tail latency intuition (p95/p99 conceptually)
  - Timeouts as a safety feature
  - Retries with exponential backoff and jitter, why naive retries amplify outages
  - Backpressure concept: do not let slow dependencies consume all your resources
- Guided practice / lab time:
  - Add an artificial delay knob to downstream (env var)
  - Add timeout to the api’s downstream call
  - Add bounded retries with backoff (and optionally jitter)
  - Observe behavior as delay increases, identify the “system goes non-linear” moment
- Preview of next week:
  Statelessness vs state, why horizontal scaling breaks naive in-memory state, and how shared state changes the design.

## Lecture Materials

- Slides: _Add link_
  Suggested deck names: **Week 06, Lecture 1, Networking** and **Week 06, Lecture 2, Latency**
- Notes: _Add link_
  Suggested notes page: **Week 06, Resilience**
- Demo code (repo path): _Add link/path_
  Example: `demos/week06-compose-resilience/` or your existing repo path
- Recording (if applicable): _Add link_

## In-Class Activities

- Activity 1: **Failure Brainstorm (3–5 min)**
  Prompt: “List 6 reasons `api -> downstream` can fail even if both codebases are correct.”
  Share-out: categorize into config, networking, readiness, latency, failure.
- Activity 2: **Mitigation Mapping (5–7 min)**
  Students map each failure to one tool: env vars, DNS name, healthcheck, timeout, retry, backoff. The goal is building the habit of pairing problems with mechanisms.

## Assignments and Deadlines

- Homework released: _TBD_
  Suggested: “Make the two-service system resilient. Add /health, healthchecks, timeouts, and bounded retry with backoff. Write a short explanation of what each mechanism prevents.”
- Homework due: _TBD_
- Reading / prep for next week: _TBD_
  Suggested prep topics: stateless services, sessions, caching basics, and a short reading on tail latency and retry storms.

## Instructor Notes (Optional)

- What worked well:
  The localhost trap demo is high impact, students remember it. The “delay knob” makes latency feel real.
- What to adjust next time:
  If students get stuck on YAML details, provide a minimal Compose snippet and focus class time on concepts and runtime behavior.
- Common student misconceptions:
  - Thinking `localhost` refers to the whole system, not the current container
  - Believing `depends_on` means “ready to serve traffic”
  - Adding retries without timeouts or backoff
  - Assuming average latency is what matters, ignoring tail behavior
