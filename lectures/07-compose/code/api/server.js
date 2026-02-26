import express from 'express'

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.json({ message: 'hello from api' })
})

app.listen(port, () => {
  console.log(`API SERVICE listening on port ${port}`)
})
