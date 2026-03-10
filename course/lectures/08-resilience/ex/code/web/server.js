import express from 'express'

const app = express()
const port = 3001

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry(fn, attempts = 4, baseMs = 100) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const delay = baseMs * (2 ** i)
      await sleep(delay)
    }
  }
  throw lastError
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.get('/', async (_req, res) => {
  try {
    await withRetry(async () => {
      const ready = await fetch('http://api:3000/readyz')
      if (!ready.ok) throw new Error('api not ready')
    })

    const data = await withRetry(async () => {
      const response = await fetch('http://api:3000')
      if (!response.ok) throw new Error(`api status ${response.status}`)
      return response.json()
    })

    res.send(`<h1>Web</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
  } catch (err) {
    res.status(503).send(
      `<h1>Web</h1><p>dependency unavailable</p><pre>${err.message}</pre>`
    )
  }
})

app.listen(port, () => {
  console.log(`Web listening on port ${port}`)
})
