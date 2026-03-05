import redis from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const heartbeatMs = Number(process.env.HEARTBEAT_MS || '15000')

const client = redis.createClient({ url: redisUrl })

client.on('error', (err) => {
  console.error('Worker Redis error:', err.message)
})

await client.connect()

console.log('Worker starter is running.')
console.log('Current mode: heartbeat only (no queue processing yet).')
console.log('Activity 1: replace heartbeat with BRPOP consumer loop.')
console.log('Activity 2: add idempotency guard (SET NX) before side effects.')

setInterval(async () => {
  try {
    const depth = await client.lLen('jobs')
    console.log(`[worker heartbeat] jobs queue depth=${depth}`)
  } catch (err) {
    console.error('[worker heartbeat] queue check failed:', err.message)
  }
}, heartbeatMs)
