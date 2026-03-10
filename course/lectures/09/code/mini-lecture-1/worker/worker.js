import redis from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const queueName = process.env.QUEUE_NAME || 'jobs'

const minMs = Number(process.env.WORK_SIM_MIN_MS || '2000')
const maxMs = Number(process.env.WORK_SIM_MAX_MS || '4000')
const failRate = Number(process.env.WORK_SIM_FAIL_RATE || '0.15')

const client = redis.createClient({ url: redisUrl })

client.on('error', (err) => {
  console.error('Worker Redis error:', err.message)
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function randomDelayMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function saveJobStatus(jobId, updates) {
  const key = `job:${jobId}`
  await client.hSet(key, updates)
  await client.expire(key, 24 * 60 * 60)
}

async function processJob(job) {
  const startedAt = new Date().toISOString()

  await saveJobStatus(job.jobId, {
    status: 'processing',
    startedAt,
    updatedAt: startedAt,
  })

  const waitMs = randomDelayMs(minMs, maxMs)
  await sleep(waitMs)

  if (Math.random() < failRate) {
    const failedAt = new Date().toISOString()
    const error = `simulated worker failure after ${waitMs}ms`

    await saveJobStatus(job.jobId, {
      status: 'failed',
      updatedAt: failedAt,
      error,
    })

    console.log(`job=${job.jobId} status=failed delayMs=${waitMs}`)
    return
  }

  const finishedAt = new Date().toISOString()
  await saveJobStatus(job.jobId, {
    status: 'done',
    updatedAt: finishedAt,
    finishedAt,
    delayMs: String(waitMs),
  })

  console.log(`job=${job.jobId} status=done delayMs=${waitMs}`)
}

async function loop() {
  while (true) {
    const result = await client.brPop(queueName, 0)
    const raw = result?.element
    if (!raw) continue

    let job
    try {
      job = JSON.parse(raw)
    } catch (err) {
      console.error('Invalid job payload:', err.message)
      continue
    }

    try {
      await processJob(job)
    } catch (err) {
      const updatedAt = new Date().toISOString()
      await saveJobStatus(job.jobId, {
        status: 'failed',
        updatedAt,
        error: err.message,
      })
      console.error(`job=${job.jobId} status=failed error=${err.message}`)
    }
  }
}

await client.connect()
console.log(`Worker connected. queue=${queueName}`)
await loop()
