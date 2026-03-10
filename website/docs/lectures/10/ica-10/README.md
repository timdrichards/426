# 10 Idempotency Code

```bash
docker compose up --build -d
docker compose run --rm demo no-idem-observe
docker compose run --rm demo idem-observe
```
