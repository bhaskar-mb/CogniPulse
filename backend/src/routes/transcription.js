import express from 'express'
import { authenticate, authorize, requireApprovedTeacher } from '../middleware/auth.js'
import { config } from '../config.js'

const router = express.Router()

const TRANSCRIPTION_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://127.0.0.1:3003'
const TRANSCRIBE_TIMEOUT_MS = Number(process.env.TRANSCRIBE_TIMEOUT_MS) || 15000

// Helper to transcribe audio chunk using Gemini API
async function transcribeWithGemini(base64Audio) {
  if (!config.googleApiKey) throw new Error('No Google API key configured')
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash-lite']
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'audio/wav', data: base64Audio } },
              { text: 'Transcribe the spoken words in this audio snippet word for word. Output ONLY the raw transcribed text. Do not add explanations, conversational notes, or quotes. If there is no discernible speech or only background music/silence, reply with an empty string.' }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return text.trim()
      }
    } catch {
      // try next model
    }
  }
  return ''
}

// Health/status check (proxied to transcription service or Gemini)
router.get('/status', authenticate, async (req, res) => {
  try {
    const r = await fetch(`${TRANSCRIPTION_URL}/health`, { signal: AbortSignal.timeout(2000) })
    const data = await r.json()
    return res.json({ status: data.loaded ? 'ready' : 'loading', model: data.model || 'whisper' })
  } catch (err) {
    if (config.googleApiKey) {
      return res.json({ status: 'ready', model: 'gemini-speech-ai' })
    }
    res.status(503).json({ status: 'unavailable', error: 'Transcription service not reachable' })
  }
})

// Transcribe an audio chunk — try faster-whisper first, then fallback to Gemini
router.post('/transcribe', authenticate, authorize('teacher'), requireApprovedTeacher, async (req, res) => {
  if (!req.body || !req.body.audio) {
    return res.status(400).json({ error: 'No audio provided' })
  }

  // 1. Try faster-whisper service
  try {
    const r = await fetch(`${TRANSCRIPTION_URL}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)
    })
    if (r.ok) {
      const data = await r.json()
      return res.status(r.status).json(data)
    }
  } catch (err) {
    // Whisper service unreachable, fallback below
  }

  // 2. Fallback to Gemini transcription
  if (config.googleApiKey) {
    try {
      const text = await transcribeWithGemini(req.body.audio)
      return res.json({ text, model: 'gemini' })
    } catch (gErr) {
      console.error('Gemini transcription fallback error:', gErr.message)
    }
  }

  res.status(502).json({ error: 'Transcription service unavailable' })
})

// Fetch YouTube video metadata (title, author) for video mode
router.get('/youtube-info', authenticate, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'URL is required' })
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const r = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) })
    if (r.ok) {
      const data = await r.json()
      return res.json({ title: data.title || '', author: data.author_name || '' })
    }
    res.status(404).json({ error: 'Video info not found' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
