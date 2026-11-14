import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRoutes from '../backend/src/routes/auth.js'
import roomRoutes from '../backend/src/routes/rooms.js'
import questionRoutes from '../backend/src/routes/questions.js'
import responseRoutes from '../backend/src/routes/responses.js'
import analyticsRoutes from '../backend/src/routes/analytics.js'
import '../backend/src/models/index.js'

const DEFAULT_MONGO_URI = 'mongodb+srv://bm7728025_db_user:69NIWzsGo7ra5Ba0@cluster0.zsq1agm.mongodb.net/cognipulse?retryWrites=true&w=majority'
let dbPromise = null

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (dbPromise) return dbPromise
  const uri = process.env.MONGODB_URI || DEFAULT_MONGO_URI
  dbPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    maxPoolSize: 10
  }).then(c => {
    console.log('[Vercel Serverless] MongoDB Connected')
    return c
  }).catch(e => {
    console.error('[Vercel Serverless] MongoDB Error:', e.message)
    dbPromise = null
    throw e
  })
  return dbPromise
}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Health checks
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel-serverless',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_disconnected',
    timestamp: new Date().toISOString()
  })
}
app.get('/api/health', healthHandler)
app.get('/health', healthHandler)
app.get('/api', healthHandler)

// Mount both with /api and without /api to guarantee matching regardless of rewrite behavior
app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)

app.use('/api/rooms', roomRoutes)
app.use('/rooms', roomRoutes)

app.use('/api/questions', questionRoutes)
app.use('/questions', questionRoutes)

app.use('/api/responses', responseRoutes)
app.use('/responses', responseRoutes)

app.use('/api/analytics', analyticsRoutes)
app.use('/analytics', analyticsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.url })
})

export default async function handler(req, res) {
  try {
    await connectDB()
  } catch (err) {
    console.error('MongoDB connection failure in serverless handler:', err.message)
  }

  return new Promise((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
    try {
      app(req, res)
    } catch (e) {
      console.error('Express execution error:', e)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: e.message })
      }
      resolve()
    }
  })
}
