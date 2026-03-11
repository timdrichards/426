---
id: homework-01
title: 'Homework 1'
sidebar_position: 1
slug: /assignments/homework/homework-01
releaseDate: '2026-03-05'
dueDate: '2026-03-24'
---

# Homework 1

## Reliable Campus Kiosk Simulation

Build a small queue-backed simulation using Express, simple HTML, Redis, Docker, and Docker Compose.

Users submit kiosk orders through a plain HTML kiosk page. The API should respond quickly and enqueue work. A worker container processes those orders asynchronously. A second plain HTML monitoring page should show the simulation state. The key requirement is idempotency: if the same logical order is submitted more than once, your system must not create duplicate completed work.

This assignment is designed to be hands-on and visual. When it works, you should be able to place an order, watch the monitor update, and explain why duplicate retries are safe.

### Required system pieces

- `api` container using Express
- `worker` container for asynchronous processing
- `redis` container for queue and shared state
- kiosk simulator page using plain HTML
- monitoring page using plain HTML
- `docker compose up --build` workflow
- `POST /orders`
- `GET /orders/:requestId`

### Required behavior

- first-time requests are accepted and queued
- order state is visible through Redis-backed status data
- kiosk and monitor interactions use plain HTML
- duplicate logical requests return a non-error response
- duplicate logical requests do not create duplicate fulfilled orders

### Deliverables

- one `hw01/` folder
- `brief.md` filled in
- screenshots in `shots/`
- videos in `vids/`
- implementation in `code/`

Only screenshots and videos linked from `brief.md` will be reviewed.

AI use is expected and encouraged for this assignment, with disclosure and verification.

Build something small, clear, and fun to demo.

Submit a `.zip` file to Canvas by **March 24, 2026 at 11:59 PM ET**.

The detailed course-site version lives at [`/docs/hw/01`](/docs/hw/01).
