# Docker Fundamentals Slide Deck Plan

## Slide List (24) with Cast Suggestions

1. **Docker Fundamentals for the Modular Monolith** — Title slide, course context, learning goals snapshot.
2. **What Docker Is (Working Model)** — Short definition of Docker + image + container.
3. **Mental Model Diagram** — Mermaid flowchart (host → engine → image → container → app).
4. **Key Definitions (Keep These Straight)** — Docker, image, container, Dockerfile, registry, port mapping.
5. **This Repo’s Docker Setup** — Dockerfile responsibilities + key files list.
6. **Dockerfile Walkthrough** — Step-by-step list of stages + why each exists.
7. **Verify Docker Is Ready** — `docker --version`, `docker context ls`, `docker info` + expected outcomes.
   - Cast: show commands + `docker info` success.
8. **Build the Image** — `docker build -t scheduler:guide .` + explanation.
   - Cast: build command + a few key output lines.
9. **Build Output & Layer Caching** — Example output snippet + why `package*.json` first.
10. **Image Inventory** — `docker image ls` + filter example.
    - Cast: run image list and show `scheduler:guide`.
11. **Run the App Container** — Full `docker run` command with flags and explanation.
    - Cast: run container; show it starting.
12. **Port Mapping Explained** — Diagram + `-p host:container` clarity + `localhost:3000`.
13. **Validate the App** — `/` and `/health` endpoints + expected JSON.
    - Cast: `curl localhost:3000/health`.
14. **Container Lifecycle** — `docker stop`, `docker start`, `docker rm`, `docker rm -f`.
    - Cast: stop/start/remove sequence.
15. **Inspect Running State** — `docker ps`, `docker ps -a` and how to read columns.
    - Cast: `docker ps` and `docker ps -a`.
16. **Logs for Debugging** — `docker logs` / `docker logs -f` + when to use each.
    - Cast: `docker logs -f scheduler-guide` while sending a request.
17. **Inspect Metadata** — `docker inspect` + `--format` examples.
    - Cast: inspect status + ports format.
18. **Exec Into Container** — `docker exec -it … sh` + inside checks.
    - Cast: exec in, `ls`, `cat package.json`, `ls dist`, `exit`.
19. **Process & Resource Visibility** — `docker top`, `docker stats` with short output example.
    - Cast: show `docker stats` briefly.
20. **Debugging Workflow** — Step-by-step flow from guide (ps → logs → ports → health → exec).
21. **Cleanup Commands** — `docker container prune`, `docker image prune`, `docker system prune -a`.
    - Cast: optional if you want to demo prune (can be risky; maybe simulated output).
22. **Common Mistakes & Fixes** — Port conflict, daemon not running, tag mismatch.
    - Cast: optional small snippet of port conflict error if easy to reproduce.
23. **Mini Lab: Proficiency Check** — 7-step lab (scheduler:lab).
    - Cast: optional “challenge recap” with steps typed quickly.
24. **Résumé‑Ready Summary** — Skills/commands mastered; next step: Compose.

---

## Cast Plan

### Cast 01 — Docker Ready Check (Slide 7)

```bash
# Confirm CLI + context + daemon
cd /path/to/scheduling-app

docker --version
docker context ls
docker info
```

Notes:
- If `docker info` fails, show the error and mention Docker Desktop is off.
- If it succeeds, highlight `Server Version` and `Operating System` lines.

---

### Cast 02 — Build Image (Slide 8)

```bash
cd /path/to/scheduling-app

docker build -t scheduler:guide .
```

Notes:
- Let it run long enough to show a couple of step lines and a successful finish.
- Optionally scroll to show cached steps if rebuild.

---

### Cast 03 — Image Inventory (Slide 10)

```bash
docker image ls
docker image ls scheduler:guide
```

Notes:
- Point out repository/tag/size and image ID.

---

### Cast 04 — Run Container (Slide 11)

```bash
cd /path/to/scheduling-app

docker run --name scheduler-guide --env-file .env -p 3000:3000 scheduler:guide
```

Notes:
- Leave it running so logs show the app starting.
- You can stop it later in a separate cast.

---

### Cast 05 — Health Check (Slide 13)

```bash
curl http://localhost:3000/health
```

Notes:
- Show the JSON response `{ "ok": true }`.

---

### Cast 06 — Lifecycle: Stop/Start/Remove (Slide 14)

```bash
docker stop scheduler-guide
docker start scheduler-guide
docker rm -f scheduler-guide
```

Notes:
- If you want to keep the container, skip `rm -f`.

---

### Cast 07 — Container State (Slide 15)

```bash
docker ps
docker ps -a
```

Notes:
- Point out status and port mapping columns.

---

### Cast 08 — Logs (Slide 16)

```bash
docker logs scheduler-guide
# or follow
# docker logs -f scheduler-guide
```

Notes:
- If using `-f`, hit the health endpoint in another terminal to show activity.

---

### Cast 09 — Inspect Metadata (Slide 17)

```bash
docker inspect scheduler-guide --format '{{.State.Status}}'
docker inspect scheduler-guide --format '{{json .NetworkSettings.Ports}}'
```

Notes:
- If template formatting looks messy on screen, run one at a time.

---

### Cast 10 — Exec Into Container (Slide 18)

```bash
docker exec -it scheduler-guide sh

pwd
ls
cat package.json
ls dist
exit
```

Notes:
- Keep it quick; show that the built artifacts are in `dist`.

---

### Cast 11 — Processes & Stats (Slide 19)

```bash
docker top scheduler-guide
docker stats scheduler-guide
```

Notes:
- Let `docker stats` run for a few seconds, then quit with Ctrl+C.

---

### Cast 12 — Cleanup (Slide 21) [Optional]

```bash
# Use with care
# docker container prune
# docker image prune
# docker system prune -a
```

Notes:
- Consider leaving as a “simulated” snippet to avoid deleting student images.

---

### Cast 13 — Common Error: Port Already Allocated (Slide 22) [Optional]

```bash
# Example: run when port 3000 is already in use
# docker run --name scheduler-guide --env-file .env -p 3000:3000 scheduler:guide
```

Notes:
- If you want a real error, run another process on port 3000 first.
- Otherwise, show a static error snippet on the slide.

---

### Cast 14 — Mini Lab Quick Run-Through (Slide 23) [Optional]

```bash
# Fast recap without commentary
# docker build -t scheduler:lab .
# docker run --name scheduler-lab -p 3000:3000 scheduler:lab
# curl http://localhost:3000/health
# docker exec -it scheduler-lab sh
# docker logs -f scheduler-lab
# docker stop scheduler-lab
# docker rm scheduler-lab
# docker image rm scheduler:lab
```

Notes:
- Use as a speed-run to motivate students to try it themselves.
