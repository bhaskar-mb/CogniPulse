import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL || 'marellabhaskar62@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'aoquhjlnuxratwtk'
  },
  connectionTimeout: 10000
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html } = req.body || {}
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' })
  }

  try {
    const info = await transporter.sendMail({
      from: '"CogniPulse" <marellabhaskar62@gmail.com>',
      to,
      subject,
      html
    })
    console.log(`[Vercel Email Relay] Sent to ${to}: ${info.messageId}`)
    return res.status(200).json({ ok: true, messageId: info.messageId })
  } catch (error) {
    console.error('[Vercel Email Relay Error]:', error.message)
    return res.status(500).json({ error: error.message })
  }
}

