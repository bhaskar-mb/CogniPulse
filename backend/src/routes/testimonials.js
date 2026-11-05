import express from 'express'
import Testimonial from '../models/Testimonial.js'
import { authenticate, authorizeAdmin } from '../middleware/auth.js'

const router = express.Router()

// ── Public: get approved testimonials (landing page) ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ approved: true })
      .sort({ approvedAt: -1 })
      .limit(12)
      .select('displayName displayRole content rating createdAt')
    res.json({ testimonials })
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch testimonials' })
  }
})

// ── Authenticated: submit / update own testimonial ────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, rating } = req.body
    if (!content || content.trim().length < 20) {
      return res.status(400).json({ error: 'Testimonial must be at least 20 characters' })
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    const displayRole = req.user.role === 'teacher'
      ? `${req.user.department || 'Teacher'}`
      : `Student`

    const testimonial = await Testimonial.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        displayName: req.user.name,
        displayRole,
        content: content.trim(),
        rating,
        approved: false, // reset approval when re-submitted
        approvedBy: null,
        approvedAt: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({
      message: 'Testimonial submitted! It will appear after admin approval.',
      testimonial
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Authenticated: get own testimonial ───────────────────────────────────────
router.get('/mine', authenticate, async (req, res) => {
  try {
    const testimonial = await Testimonial.findOne({ user: req.user._id })
    res.json({ testimonial: testimonial || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: list all (pending + approved) ─────────────────────────────────────
router.get('/admin/all', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const testimonials = await Testimonial.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email role')
    res.json({ testimonials })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: approve a testimonial ─────────────────────────────────────────────
router.patch('/:id/approve', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { approved: true, approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    )
    if (!testimonial) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Testimonial approved', testimonial })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Admin: reject / remove a testimonial ─────────────────────────────────────
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id)
    res.json({ message: 'Testimonial deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
