# Mini Lecture 2 Demo: Duplicate Delivery and Idempotency

This stack demonstrates the "pain and relief" of duplicate job delivery:

- `api-no-idem` + `worker-no-idem`: duplicate jobs run side effects multiple times
- `api-idem` + `worker-idem`: idempotency guard skips duplicate side effects
- `demo`: runs all test scenarios from inside Docker (no host `curl` required)

## Start

```bash
cd code/09-decoupling/mini-lecture-2
docker compose up --build -d
```

## Observe (single duplicate)

```bash
docker compose run --rm demo no-idem-observe
docker compose run --rm demo idem-observe
```

## Load (many duplicates)

```bash
docker compose run --rm demo no-idem-load 8 2
docker compose run --rm demo idem-load 8 2
```

## Watch worker behavior

```bash
docker compose logs -f worker-no-idem worker-idem
```

## Help

```bash
docker compose run --rm demo help
```

## Stop

```bash
docker compose down
```
