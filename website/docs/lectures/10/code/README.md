# 10 Idempotency Code

This lecture has separate runnable directories:

- `mini-lecture-2/` -> instructor demo stack for duplicates vs idempotency
- `activity-2/` -> starter code for Activity 2 idempotency implementation

## Mini-Lecture 2 Demo

```bash
cd website/website/docs/lectures/10/code/mini-lecture-2
docker compose up --build -d
docker compose run --rm demo no-idem-observe
docker compose run --rm demo idem-observe
```

## Activity 2 Starter

```bash
cd website/website/docs/lectures/10/code/activity-2
docker compose up --build
docker compose run --rm demo duplicate-observe
```
