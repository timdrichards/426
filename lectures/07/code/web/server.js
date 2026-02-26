import express from 'express'

const app = express()
const port = 3001

app.get('/', async (req, res) => {
  const response = await fetch('http://api:3000')
  const data = await response.json()
  res.send(`<h1>Web</h1><pre>${JSON.stringify(data, null, 2)}</pre>`)
})

app.listen(port, () => {
  console.log(`Web listening on port ${port}`)
})
