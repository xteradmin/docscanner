import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRoutes from './modules/api/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api', apiRoutes)

app.use(express.static(join(__dirname, '../public')))

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'))
})

app.listen(PORT, () => {
  console.log(`DocScanner server running on port ${PORT}`)
})
