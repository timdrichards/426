import crypto from 'crypto'
import express from 'express'
import redis from 'redis'

const app = express()
const port = Number(process.env.PORT || '3000')

const mode = process.env.MODE || 'baseline'
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const queueName = process.env.QUEUE_NAME || 'jobs'

const minMs = Number(process.env.WORK_SIM_MIN_MS || '2000')
const maxMs = Number(process.env.WORK_SIM_MAX_MS || '4000')
const failRate = Number(process.env.WORK_SIM_FAIL_RATE || '0.30')

let client = null
let redisReady = false

app.use(express.json())

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function randomDelayMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shouldFail(task) {
  if (task?.forceFail === true) return true
  return Math.random() < failRate
}

async function doSlowWork(task) {
  const waitMs = randomDelayMs(minMs, maxMs)
  await sleep(waitMs)

  if (shouldFail(task)) {
    throw new Error(`simulated side-effect failure after ${waitMs}ms`)
  }

  return { waitMs }
}

async function initRedisIfNeeded() {
  if (mode !== 'queued') return

  client = redis.createClient({ url: redisUrl })

  client.on('ready', () => {
    redisReady = true
  })

  client.on('end', () => {
    redisReady = false
  })

  client.on('error', (err) => {
    redisReady = false
    console.error('Redis error:', err.message)
  })

  await client.connect()
}

async function saveJobStatus(jobId, updates) {
  if (!client) return
  const key = `job:${jobId}`
  await client.hSet(key, updates)
  await client.expire(key, 24 * 60 * 60)
}

app.get('/healthz', (_req, res) => {
  if (mode === 'queued' && !redisReady) {
    res.status(503).json({ status: 'degraded', mode, redisReady })
    return
  }

  res.status(200).json({ status: 'ok', mode, redisReady })
})

app.get('/', (_req, res) => {
  res.json({
    service: 'api',
    mode,
    queueName,
    message:
      mode === 'baseline'
        ? 'Synchronous baseline. POST /tasks performs slow work inline.'
        : 'Queued relief mode. POST /tasks enqueues and returns quickly.',
  })
})

app.post('/tasks', async (req, res) => {
  const task = req.body ?? {}
  const jobId = task.id || crypto.randomUUID()
  const startedAt = Date.now()

  if (mode === 'baseline') {
    try {
      const result = await doSlowWork({ ...task, jobId })
      const durationMs = Date.now() - startedAt

      res.status(201).json({
        accepted: true,
        mode,
        status: 'completed-inline',
        jobId,
        durationMs,
        simulatedDelayMs: result.waitMs,
      })
      return
    } catch (err) {
      const durationMs = Date.now() - startedAt
      res.status(500).json({
        accepted: false,
        mode,
        status: 'failed-inline',
        jobId,
        durationMs,
        error: err.message,
      })
      return
    }
  }

  if (!client || !redisReady) {
    res.status(503).json({
      accepted: false,
      mode,
      status: 'queue-unavailable',
    })
    return
  }

  const job = {
    jobId,
    task,
    enqueuedAt: new Date().toISOString(),
  }

  await saveJobStatus(jobId, {
    status: 'queued',
    mode,
    queuedAt: job.enqueuedAt,
    updatedAt: job.enqueuedAt,
  })

  await client.lPush(queueName, JSON.stringify(job))
  const depth = await client.lLen(queueName)

  res.status(202).json({
    accepted: true,
    mode,
    status: 'queued',
    jobId,
    queueName,
    queueDepth: depth,
    statusUrl: `/jobs/${jobId}`,
  })
})

app.get('/jobs/:jobId', async (req, res) => {
  if (mode !== 'queued' || !client) {
    res.status(400).json({ error: 'Job status is available only in queued mode.' })
    return
  }

  const jobId = req.params.jobId
  const key = `job:${jobId}`
  const data = await client.hGetAll(key)

  if (!data || Object.keys(data).length === 0) {
    res.status(404).json({ error: 'job not found', jobId })
    return
  }

  res.json({ jobId, ...data })
})

app.get('/queue-depth', async (_req, res) => {
  if (mode !== 'queued' || !client) {
    res.status(400).json({ error: 'Queue depth is available only in queued mode.' })
    return
  }

  const depth = await client.lLen(queueName)
  res.json({ queueName, depth })
})

initRedisIfNeeded()
  .then(() => {
    app.listen(port, () => {
      console.log(`API listening on port ${port} in mode=${mode}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start API:', err.message)
    process.exit(1)
  })
