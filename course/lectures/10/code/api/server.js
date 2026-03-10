import crypto from "crypto";
import express from "express";
import redis from "redis";

const app = express();
const port = Number(process.env.PORT || "3000");

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const queueName = process.env.QUEUE_NAME || "jobs";
const pipeline = process.env.PIPELINE || "no-idem";
const ttlSec = Number(process.env.TTL_SEC || "86400");

const client = redis.createClient({ url: redisUrl });

client.on("error", (err) => {
  console.error("Redis error:", err.message);
});

app.use(express.json());

function jobKey(jobId) {
  return `job:${pipeline}:${jobId}`;
}

function effectKey(jobId) {
  return `effect:${pipeline}:${jobId}`;
}

function enqueueCountKey(jobId) {
  return `enqueue:${pipeline}:${jobId}`;
}

function totalEffectsKey() {
  return `effects-total:${pipeline}`;
}

app.get("/healthz", async (_req, res) => {
  try {
    await client.ping();
    res.status(200).json({ status: "ok", pipeline, queueName });
  } catch {
    res.status(503).json({ status: "not-ready", pipeline, queueName });
  }
});

app.get("/", (_req, res) => {
  res.json({
    service: "mini-lecture-2-api",
    pipeline,
    queueName,
    message:
      pipeline === "idem"
        ? "Idempotent pipeline: duplicate jobs should not repeat side effects."
        : "Non-idempotent pipeline: duplicate jobs repeat side effects.",
  });
});

app.post("/tasks", async (req, res) => {
  const payload = req.body ?? {};
  const jobId = payload.jobId || payload.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const enqueueCount = await client.incr(enqueueCountKey(jobId));
  await client.expire(enqueueCountKey(jobId), ttlSec);

  const job = {
    jobId,
    payload,
    pipeline,
    queueName,
    submittedAt: now,
    enqueueCount,
  };

  await client.hSet(jobKey(jobId), {
    status: "queued",
    pipeline,
    queueName,
    updatedAt: now,
    queuedAt: now,
    enqueueCount: String(enqueueCount),
  });
  await client.expire(jobKey(jobId), ttlSec);

  await client.lPush(queueName, JSON.stringify(job));
  const queueDepth = await client.lLen(queueName);

  res.status(202).json({
    accepted: true,
    pipeline,
    queueName,
    jobId,
    enqueueCount,
    queueDepth,
    statusUrl: `/jobs/${jobId}`,
    effectsUrl: `/effects/${jobId}`,
  });
});

app.get("/jobs/:jobId", async (req, res) => {
  const jobId = req.params.jobId;
  const data = await client.hGetAll(jobKey(jobId));

  if (!data || Object.keys(data).length === 0) {
    res.status(404).json({ error: "job not found", jobId, pipeline });
    return;
  }

  res.json({ jobId, pipeline, ...data });
});

app.get("/effects/:jobId", async (req, res) => {
  const jobId = req.params.jobId;
  const effectCount = Number((await client.get(effectKey(jobId))) || "0");
  const enqueueCount = Number(
    (await client.get(enqueueCountKey(jobId))) || "0",
  );

  res.json({
    jobId,
    pipeline,
    effectCount,
    enqueueCount,
  });
});

app.get("/stats", async (_req, res) => {
  const queueDepth = await client.lLen(queueName);
  const totalEffects = Number((await client.get(totalEffectsKey())) || "0");

  res.json({
    pipeline,
    queueName,
    queueDepth,
    totalEffects,
  });
});

await client.connect();

app.listen(port, () => {
  console.log(
    `API listening on port ${port} pipeline=${pipeline} queue=${queueName}`,
  );
});
