# 09 Decoupling Code

This lecture now has separate runnable directories:

- `activity-1/` -> starter code for Activity 1
- `mini-lecture-1/` -> instructor demo stack for pain vs relief (includes Docker `demo` runner)
- `mini-lecture-2/` -> instructor demo stack for duplicates vs idempotency
- `activity-2/` -> starter code for Activity 2 idempotency implementation

## Activity 1 Starter

```bash
cd code/09-decoupling/activity-1
docker compose up --build
```

## Mini-Lecture 1 Demo

```bash
cd code/09-decoupling/mini-lecture-1
docker compose up --build -d
docker compose run --rm demo baseline-observe
docker compose run --rm demo relief-observe
```

## Mini-Lecture 2 Demo

```bash
cd code/09-decoupling/mini-lecture-2
docker compose up --build -d
docker compose run --rm demo no-idem-observe
docker compose run --rm demo idem-observe
```

## Activity 2 Starter

```bash
cd code/09-decoupling/activity-2
docker compose up --build
docker compose run --rm demo duplicate-observe
```
