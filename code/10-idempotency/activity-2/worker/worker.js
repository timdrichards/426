import redis from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const queueName = process.env.QUEUE_NAME || 'jobs'
const pipeline = process.env.PIPELINE || 'activity2'
const minMs = Number(process.env.WORK_SIM_MIN_MS || '300')
const maxMs = Number(process.env.WORK_SIM_MAX_MS || '900')
const ttlSec = Number(process.env.IDEM_TTL_SEC || '86400')

const client = redis.createClient({ url: redisUrl })

client.on('error', (err) => {
  console.error('Worker Redis error:', err.message)
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function randomDelayMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function jobKey(jobId) {
  return `job:${pipeline}:${jobId}`
}

function effectKey(jobId) {
  return `effect:${pipeline}:${jobId}`
}

function processedKey(jobId) {
  return `processed:${pipeline}:${jobId}`
}

async function applySideEffect(jobId) {
  const delayMs = randomDelayMs(minMs, maxMs)
  await sleep(delayMs)

  const effectCount = await client.incr(effectKey(jobId))
  await client.expire(effectKey(jobId), ttlSec)

  return { delayMs, effectCount }
}

async function processJob(job) {
  const now = new Date().toISOString()

  await client.hSet(jobKey(job.jobId), {
    status: 'processing',
    updatedAt: now,
    pipeline,
  })
  await client.hIncrBy(jobKey(job.jobId), 'processAttempts', 1)
  await client.expire(jobKey(job.jobId), ttlSec)

  /*
    Activity 2 TODO:
    1) Add idempotency claim with SET NX, for example:
         const claimed = await client.set(processedKey(job.jobId), '1', { NX: true, EX: ttlSec })
    2) If not claimed, skip side effect and log duplicate skip.
    3) Update job hash with duplicate-skipped status + counter.
  */

  const { delayMs, effectCount } = await applySideEffect(job.jobId)
  const doneAt = new Date().toISOString()

  await client.hSet(jobKey(job.jobId), {
    status: 'done',
    updatedAt: doneAt,
    finishedAt: doneAt,
    effectCount: String(effectCount),
    idempotency: 'not-implemented',
  })

  console.log(`job=${job.jobId} status=done effectCount=${effectCount} delayMs=${delayMs}`)
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
      const failedAt = new Date().toISOString()
      await client.hSet(jobKey(job.jobId), {
        status: 'failed',
        updatedAt: failedAt,
        error: err.message,
      })
      console.error(`job=${job.jobId} status=failed error=${err.message}`)
    }
  }
}

await client.connect()
console.log(`Worker connected pipeline=${pipeline} queue=${queueName}`)
await loop()
