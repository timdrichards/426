import express from 'express'
import redis from 'redis'

const app = express()
const port = 3000
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const client = redis.createClient({ url: redisUrl })

let redisReady = false

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

client.connect().catch((err) => {
  console.error('Initial Redis connect failed:', err.message)
})

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/readyz', async (_req, res) => {
  try {
    await client.ping()
    res.status(200).json({ status: 'ready' })
  } catch {
    res.status(503).json({ status: 'not-ready' })
  }
})

app.get('/', async (_req, res) => {
  try {
    const visits = await client.incr('visits')
    res.json({
      message: 'hello from api',
      redisReady,
      visits,
    })
  } catch (err) {
    res.status(503).json({
      message: 'hello from api',
      redisReady: false,
      error: `redis unavailable: ${err.message}`,
    })
  }
})

app.listen(port, () => {
  console.log(`API SERVICE listening on port ${port}`)
})
