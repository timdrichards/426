# Homework 01: Reliable Campus Kiosk Simulation

## Course Context

- Course: COMPSCI 426
- Assignment Type: coding-implementation
- Difficulty: intermediate
- Target Completion Time: 6.5 hours
- Delivery: Individual
- Due: March 24, 2026 at 11:59 PM ET

## Learning Objectives

- Containerize a small multi-service Node.js system with Docker and Docker Compose.
- Use Redis both as a queue boundary and as shared state for job or order tracking.
- Implement an Express API that accepts work quickly and separates request handling from background processing.
- Build simple HTMX-driven interfaces for both order submission and simulation monitoring.
- Apply idempotency so duplicate submissions do not create duplicate side effects.
- Validate the system with reproducible commands, logs, and short engineering notes.

## Key Learning Outcomes

- Build and run a small multi-container web system with Docker and Docker Compose.
- Create an Express application that serves both API routes and server-rendered HTMX pages.
- Use Redis for queueing work and storing shared system state.
- Separate fast request handling from slower background work with a worker process.
- Design a simple monitoring view that makes system behavior easy to observe.
- Explain and implement idempotency so duplicate requests do not create duplicate completed work.
- Document the system clearly enough that another person can run and verify it.

## Assignment Brief

Build a small queue-backed campus kiosk simulation that practices the exact distributed-systems ideas from recent class meetings. Your system should use an Express API, Redis, a worker container, Docker Compose, and server-rendered HTMX views. One HTMX view should act as a kiosk simulator where a user can place orders. A second HTMX view should act as a monitoring dashboard where a user can observe queued, processing, completed, and duplicate-handled orders. The central correctness requirement is idempotency: repeated submission of the same logical request must not create duplicate completed orders. This homework is meant to be a manageable individual rehearsal for the larger team simulation project later in the semester.

## Required Artifacts

| Artifact | Type | Format | Notes |
| --- | --- | --- | --- |
| Submission folder | package | directory | Submit one hw01/ folder containing brief.md, shots/, vids/, and code/. |
| brief.md | writeup | md | Main grading document with run instructions, architecture, idempotency explanation, AI Use Statement, and links to evidence. |
| shots/ and vids/ | evidence | files | Only screenshots and videos linked from brief.md will be reviewed. |
| code/ | code | directory | Full runnable implementation with api, worker, HTMX views, Dockerfiles, and compose file. |

## Task Plan

### Task 1: System scaffolding and container setup (0.9h)
Create the api, worker, and Redis stack. Add Dockerfiles and a docker compose configuration that starts the full simulation with one command.

### Task 2: Express API, queue submission, and status routes (1.4h)
Implement an Express API that accepts kiosk orders, validates input, assigns or records a stable request identifier, stores visible order state, and returns quickly instead of doing simulated work inline.

### Task 3: Worker processing and Redis-backed state (1.4h)
Implement a worker container that consumes queued jobs from Redis, simulates fulfillment with a short delay, and updates per-order state so status can be observed later.

### Task 4: HTMX kiosk and monitoring views (1.2h)
Build one HTMX-driven kiosk view for placing orders and one HTMX-driven monitoring view for observing order state and recent system activity.

### Task 5: Idempotency and verification (1.6h)
Prevent duplicate submissions from causing duplicate completed effects. Demonstrate the behavior through the UI, status checks, and logs.

## Submission Instructions

- Submit a zip file to Canvas by the deadline.
- The zip file must contain one folder named hw01/ with brief.md, shots/, vids/, and code/.
- Only screenshots and videos linked from brief.md will be reviewed.
- brief.md must include run instructions, architecture notes, idempotency explanation, and an AI Use Statement.
- Because this assignment spans UI, async processing, and container orchestration, AI use is expected and encouraged. Document how you used it and what you verified yourself.

## AI Use Policy

Mode: `required-with-disclosure`

- AI use is required for at least one assignment phase.
- Include a comparison between AI-generated drafts and your refined solution.
- Grade impact comes from verification rigor and reflection quality, not output volume.

## Quick Grading Rubric

Teaching staff should primarily grade the submission by reading `rubric.md`. Manual code execution is not expected during normal grading. Code may be spot-checked or checked with simple automation if available, but the grading workflow should remain document-first.

### Knock-Out Checklist

- `hw01/` folder is present
- `rubric.md` is present
- `rubric.md` includes student name, UMass email, and SPIRE ID
- `rubric.md` links the screenshots and videos to review
- `code/`, `shots/`, and `vids/` are present
- `rubric.md` includes an AI Use Statement

### Best-Fit Rubric

| Criterion | Exceeds | Meets | Needs Improvement | Below Expectations | No Submission |
| --- | --- | --- | --- | --- | --- |
| Submission completeness | `rubric.md` is complete, well organized, and makes the submission easy to review quickly. | `rubric.md` is present and covers the expected sections well enough to review. | `rubric.md` is present but uneven, thin, or missing some important parts. | `rubric.md` is confusing, incomplete, or difficult to use. | No meaningful `rubric.md` submission. |
| Architecture and implementation explanation | The document explains the system clearly, with strong structure and useful technical choices. | The document explains the main system structure and implementation choices clearly enough. | The explanation is partly clear but leaves important gaps. | The explanation is weak, vague, or hard to follow. | No meaningful explanation of the system. |
| Evidence of working behavior | Linked screenshots and videos make the main behaviors easy to see and easy to trust. | Linked evidence supports the main claims and is sufficient for quick review. | Some evidence exists, but it is incomplete, weak, or hard to interpret. | Evidence is sparse, confusing, or does not support the claims well. | No meaningful linked evidence to review. |
| Correctness reasoning | The document gives a clear, convincing explanation of async flow, system state, and idempotency. | The document explains the core correctness ideas well enough to support the submission. | Correctness reasoning is partly present but weak, shallow, or incomplete. | Correctness reasoning is unclear, incorrect, or mostly missing. | No meaningful reasoning about correctness. |
| Professional communication | The document is concise, readable, and includes the required metadata, AI disclosure, and useful evidence links. | The document is readable and includes the required metadata and disclosure items. | Communication is uneven or some required metadata or disclosure details are weak. | Communication is hard to follow or missing important required information. | No meaningful communication artifact. |
