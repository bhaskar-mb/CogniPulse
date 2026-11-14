import { app, ensureDbConnected } from '../backend/src/index.js'

export default async function handler(req, res) {
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri']
  if (matched && matched.startsWith('/api') && req.url !== matched) {
    req.url = matched
  }
  try {
    await ensureDbConnected()
  } catch (dbErr) {
    console.error('Vercel DB connection error:', dbErr.message)
  }
  return new Promise((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
    try {
      app(req, res)
    } catch (err) {
      console.error('Vercel Handler Error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message })
      }
      resolve()
    }
  })
}
