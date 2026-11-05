import express from 'express'
import mongoose from 'mongoose'
import ClassFeedback from '../models/ClassFeedback.js'
import Room from '../models/Room.js'
import RoomMember from '../models/RoomMember.js'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// All feedback endpoints require authentication
router.use(authenticate)

/**
 * POST /api/feedback/room/:roomId
 * Student submits or updates feedback for a class/room
 */
router.post('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const studentId = req.user._id
    
    // Resolve user name reliably from req.user or DB
    let studentName = req.user.name
    if (!studentName) {
      const dbUser = await User.findById(studentId).select('name email').lean()
      studentName = dbUser?.name || dbUser?.email?.split('@')[0] || 'Student'
    }

    const { rating, understanding, pace, favoriteTopic, comment, isAnonymous } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please provide a valid rating from 1 to 5 stars' })
    }

    const room = await Room.findById(roomId)
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const roomObjId = new mongoose.Types.ObjectId(roomId)
    const studentObjId = new mongoose.Types.ObjectId(studentId)

    // Ensure student is registered as room member (idempotent)
    await RoomMember.findOneAndUpdate(
      { roomId: roomObjId, studentId: studentObjId },
      { $setOnInsert: { roomId: roomObjId, studentId: studentObjId, joinedAt: new Date() } },
      { upsert: true, new: true }
    ).catch(() => {})

    const feedbackDoc = await ClassFeedback.findOneAndUpdate(
      { roomId: roomObjId, studentId: studentObjId },
      {
        $set: {
          studentName,
          rating: Number(rating),
          understanding: understanding || 'mostly_clear',
          pace: pace || 'just_right',
          favoriteTopic: favoriteTopic ? String(favoriteTopic).slice(0, 100) : '',
          comment: comment ? String(comment).slice(0, 500) : '',
          isAnonymous: !!isAnonymous,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // Notify room and teacher via socket
    const io = req.app.get('io')
    if (io) {
      const payload = {
        roomId,
        studentName: isAnonymous ? 'Anonymous Student' : studentName,
        rating: feedbackDoc.rating,
        understanding: feedbackDoc.understanding,
        pace: feedbackDoc.pace,
        favoriteTopic: feedbackDoc.favoriteTopic,
        comment: feedbackDoc.comment,
        createdAt: feedbackDoc.createdAt
      }
      if (room.code) {
        io.to(room.code).emit('feedback:submitted', payload)
      }
      if (room.teacher) {
        io.to('user:' + room.teacher.toString()).emit('feedback:submitted', payload)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: feedbackDoc
    })
  } catch (error) {
    console.error('[Feedback Submission Error]:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

/**
 * GET /api/feedback/room/:roomId/my
 * Student fetches their own submitted feedback for this room
 */
router.get('/room/:roomId/my', async (req, res) => {
  try {
    const { roomId } = req.params
    const studentId = req.user._id

    const roomObjId = new mongoose.Types.ObjectId(roomId)
    const studentObjId = new mongoose.Types.ObjectId(studentId)

    const feedback = await ClassFeedback.findOne({ roomId: roomObjId, studentId: studentObjId })
    res.json({
      success: true,
      feedback: feedback || null
    })
  } catch (error) {
    console.error('[Get My Feedback Error]:', error)
    res.status(500).json({ error: 'Failed to fetch your feedback' })
  }
})

/**
 * GET /api/feedback/room/:roomId/stats
 * Teacher (or room members) view aggregated feedback stats and reviews
 */
router.get('/room/:roomId/stats', async (req, res) => {
  try {
    const { roomId } = req.params
    const currentUser = req.user

    const room = await Room.findById(roomId)
    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const roomObjId = new mongoose.Types.ObjectId(roomId)
    const feedbacks = await ClassFeedback.find({ roomId: roomObjId })
      .populate('studentId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .lean()

    const totalCount = feedbacks.length
    if (totalCount === 0) {
      return res.json({
        success: true,
        stats: {
          totalCount: 0,
          averageRating: 0,
          ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          paceBreakdown: { too_slow: 0, just_right: 0, too_fast: 0 },
          understandingBreakdown: { clear: 0, mostly_clear: 0, neutral: 0, difficult: 0 },
          feedbacks: []
        }
      })
    }

    const ratingsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const paceBreakdown = { too_slow: 0, just_right: 0, too_fast: 0 }
    const understandingBreakdown = { clear: 0, mostly_clear: 0, neutral: 0, difficult: 0 }
    let totalRatingSum = 0

    feedbacks.forEach(f => {
      totalRatingSum += (f.rating || 5)
      if (ratingsCount[f.rating] !== undefined) ratingsCount[f.rating]++
      if (paceBreakdown[f.pace] !== undefined) paceBreakdown[f.pace]++
      if (understandingBreakdown[f.understanding] !== undefined) understandingBreakdown[f.understanding]++
    })

    const averageRating = Number((totalRatingSum / totalCount).toFixed(1))

    // Formatted feedback list with real student names
    const sanitizedFeedbacks = feedbacks.map(f => {
      const resolvedName = f.studentId?.name || f.studentName || 'Student'
      return {
        _id: f._id,
        rating: f.rating,
        understanding: f.understanding,
        pace: f.pace,
        favoriteTopic: f.favoriteTopic,
        comment: f.comment,
        isAnonymous: f.isAnonymous,
        studentName: f.isAnonymous ? 'Anonymous Student' : resolvedName,
        studentEmail: f.studentId?.email || '',
        createdAt: f.createdAt
      }
    })

    res.json({
      success: true,
      stats: {
        totalCount,
        averageRating,
        ratingsCount,
        paceBreakdown,
        understandingBreakdown,
        feedbacks: sanitizedFeedbacks
      }
    })
  } catch (error) {
    console.error('[Get Feedback Stats Error]:', error)
    res.status(500).json({ error: 'Failed to fetch feedback stats' })
  }
})

/**
 * GET /api/feedback/teacher/summary
 * Teacher views aggregated student feedback and reviews across all their rooms
 */
router.get('/teacher/summary', async (req, res) => {
  try {
    const teacherId = req.user._id

    // Find all rooms owned by this teacher
    const rooms = await Room.find({ teacher: teacherId }).select('_id name code createdAt endedAt').lean()
    const roomIds = rooms.map(r => r._id)

    if (roomIds.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalCount: 0,
          averageRating: 0,
          ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          paceBreakdown: { too_slow: 0, just_right: 0, too_fast: 0 },
          understandingBreakdown: { clear: 0, mostly_clear: 0, neutral: 0, difficult: 0 },
          feedbacks: []
        }
      })
    }

    const roomMap = new Map(rooms.map(r => [r._id.toString(), r]))

    const feedbacks = await ClassFeedback.find({ roomId: { $in: roomIds } })
      .populate('studentId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .lean()

    const totalCount = feedbacks.length
    if (totalCount === 0) {
      return res.json({
        success: true,
        stats: {
          totalCount: 0,
          averageRating: 0,
          ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          paceBreakdown: { too_slow: 0, just_right: 0, too_fast: 0 },
          understandingBreakdown: { clear: 0, mostly_clear: 0, neutral: 0, difficult: 0 },
          feedbacks: []
        }
      })
    }

    const ratingsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const paceBreakdown = { too_slow: 0, just_right: 0, too_fast: 0 }
    const understandingBreakdown = { clear: 0, mostly_clear: 0, neutral: 0, difficult: 0 }
    let totalRatingSum = 0

    feedbacks.forEach(f => {
      totalRatingSum += (f.rating || 5)
      if (ratingsCount[f.rating] !== undefined) ratingsCount[f.rating]++
      if (paceBreakdown[f.pace] !== undefined) paceBreakdown[f.pace]++
      if (understandingBreakdown[f.understanding] !== undefined) understandingBreakdown[f.understanding]++
    })

    const averageRating = Number((totalRatingSum / totalCount).toFixed(1))

    const sanitizedFeedbacks = feedbacks.map(f => {
      const room = roomMap.get(f.roomId?.toString())
      const resolvedName = f.studentId?.name || f.studentName || 'Student'
      return {
        _id: f._id,
        roomId: f.roomId,
        roomName: room ? room.name : 'Classroom',
        roomCode: room ? room.code : '',
        rating: f.rating,
        understanding: f.understanding,
        pace: f.pace,
        favoriteTopic: f.favoriteTopic,
        comment: f.comment,
        isAnonymous: f.isAnonymous,
        studentName: f.isAnonymous ? 'Anonymous Student' : resolvedName,
        studentEmail: f.studentId?.email || '',
        createdAt: f.createdAt
      }
    })

    res.json({
      success: true,
      stats: {
        totalCount,
        averageRating,
        ratingsCount,
        paceBreakdown,
        understandingBreakdown,
        feedbacks: sanitizedFeedbacks
      }
    })
  } catch (error) {
    console.error('[Teacher Summary Feedback Error]:', error)
    res.status(500).json({ error: 'Failed to fetch teacher feedback summary' })
  }
})

export default router
