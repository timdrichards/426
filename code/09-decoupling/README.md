# 09 Decoupling Code

This lecture now has separate runnable directories:

- `activity-1/` -> starter code for Activity 1
- `mini-lecture-1/` -> instructor demo stack for pain vs relief (includes Docker `demo` runner)

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
