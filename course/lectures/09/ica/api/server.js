import crypto from 'crypto'
import express from 'express'

const app = express()
const port = 3000

const minMs = Number(process.env.WORK_SIM_MIN_MS || '2000')
const maxMs = Number(process.env.WORK_SIM_MAX_MS || '4000')
const failRate = Number(process.env.WORK_SIM_FAIL_RATE || '0.30')

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

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/', (_req, res) => {
  res.json({
    service: 'api',
    lecture: '09-decoupling',
    mode: 'inline-starter',
    message: 'POST /tasks currently does slow work inline (coupled baseline).',
  })
})

app.post('/tasks', async (req, res) => {
  const task = req.body ?? {}
  const jobId = task.id || crypto.randomUUID()
  const startedAt = Date.now()

  /*
    Activity 1 TODO:
    1. Create/connect a Redis client (`redis://redis:6379`).
    2. Build a job payload with `jobId` and task data.
    3. Enqueue job (e.g., LPUSH jobs <json>) instead of inline work.
    4. Return 202 Accepted: { accepted: true, status: 'queued', jobId }.
  */
  try {
    const result = await doSlowWork({ ...task, jobId })
    const durationMs = Date.now() - startedAt

    res.status(201).json({
      accepted: true,
      status: 'completed-inline',
      jobId,
      durationMs,
      simulatedDelayMs: result.waitMs,
    })
  } catch (err) {
    const durationMs = Date.now() - startedAt
    res.status(500).json({
      accepted: false,
      status: 'failed-inline',
      jobId,
      durationMs,
      error: err.message,
    })
  }
})

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
