let app = null
let ensureDbConnected = null
let loadError = null

async function loadBackend() {
  if (app && ensureDbConnected) return { app, ensureDbConnected }
  if (loadError) throw loadError
  try {
    process.env.VERCEL = '1'
    const backend = await import('../backend/src/index.js')
    app = backend.app
    ensureDbConnected = backend.ensureDbConnected
    return { app, ensureDbConnected }
  } catch (err) {
    loadError = err
    console.error('[API Index Import Fatal]:', err)
    throw err
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri']
  if (matched && matched.startsWith('/api') && req.url !== matched) {
    req.url = matched
  }

  let backendInstance
  try {
    backendInstance = await loadBackend()
  } catch (err) {
    return res.status(500).json({
      error: 'Backend initialization failed',
      message: err.message,
      stack: err.stack
    })
  }

  try {
    await backendInstance.ensureDbConnected()
  } catch (dbErr) {
    console.error('Vercel DB connection error:', dbErr.message)
  }

  return new Promise((resolve) => {
    res.on('finish', resolve)
    res.on('close', resolve)
    try {
      backendInstance.app(req, res)
    } catch (err) {
      console.error('Vercel Handler Error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message })
      }
      resolve()
    }
  })
}
