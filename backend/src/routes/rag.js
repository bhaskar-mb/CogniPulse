import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticate, authorize, requireApprovedTeacher } from '../middleware/auth.js'
import CourseMaterial from '../models/CourseMaterial.js'
import Room from '../models/Room.js'
import RoomMember from '../models/RoomMember.js'
import { parseDocument, chunkText } from '../services/documentParserService.js'
import { indexDocumentChunks, querySimilarChunks, deleteMaterialChunks, getRoomRagStats, indexLectureTranscript } from '../services/vectorStoreService.js'
import { generateRagQuestions } from '../services/ragEngine.js'
import { analyzeStudentPerformance, getClassRagAnalytics, getStudentLessonFeedback } from '../services/performanceAnalyzerService.js'
import StudentLearningProfile from '../models/StudentLearningProfile.js'

const router = express.Router()

// Configure multer storage for uploaded course materials
const uploadDir = path.resolve(process.cwd(), 'uploads/materials')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    cb(null, `${uniqueSuffix}-${safeName}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md', '.pptx', '.csv', '.json']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type ${ext}. Allowed: PDF, DOCX, TXT, MD`))
    }
  }
})

router.use(authenticate)

/**
 * POST /api/rag/materials/upload
 * Teacher uploads course material (PDF, DOCX, TXT), which is parsed and indexed into vector DB.
 */
router.post('/materials/upload', authorize('teacher'), requireApprovedTeacher, upload.single('file'), async (req, res) => {
  let uploadedFilePath = null
  try {
    const { roomId, title, description } = req.body
    if (!roomId) {
      return res.status(400).json({ success: false, error: 'roomId is required' })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    uploadedFilePath = req.file.path
    const originalName = req.file.originalname
    const ext = path.extname(originalName).replace('.', '').toLowerCase()

    // Verify room ownership
    const room = await Room.findById(roomId)
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' })
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to upload materials to this room' })
    }

    // 1. Create CourseMaterial record
    const material = new CourseMaterial({
      roomId,
      teacherId: req.user._id,
      title: title || originalName.replace(/\.[^/.]+$/, ''),
      fileName: originalName,
      fileType: ext || 'pdf',
      fileSize: req.file.size,
      status: 'processing',
      description: description || ''
    })
    await material.save()

    // 2. Parse document text
    const { text, metadata } = await parseDocument(uploadedFilePath, originalName)

    // 3. Chunk text semantically
    const chunks = chunkText(text, { chunkSize: 650, overlap: 100 })

    // 4. Index into Vector Store
    const savedChunks = await indexDocumentChunks({
      roomId,
      sourceId: material._id,
      sourceModel: 'CourseMaterial',
      docType: 'course_material',
      sourceTitle: material.title,
      chunks
    })

    // 5. Update material status
    material.status = 'indexed'
    material.totalChunks = savedChunks.length
    material.topics = Array.from(new Set(chunks.flatMap(c => c.concepts || []))).slice(0, 10)
    await material.save()

    // Clean up temporary disk file
    if (fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath)
    }

    res.status(201).json({
      success: true,
      material,
      chunksCount: savedChunks.length,
      topics: material.topics
    })
  } catch (err) {
    console.error('[RAG Upload Error]:', err)
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try { fs.unlinkSync(uploadedFilePath) } catch (_) {}
    }
    res.status(500).json({ success: false, error: err.message || 'Failed to process and index document' })
  }
})

/**
 * GET /api/rag/materials?roomId=xxx
 * List indexed course materials and RAG status for a room.
 */
router.get('/materials', async (req, res) => {
  try {
    const { roomId } = req.query
    if (!roomId) return res.status(400).json({ success: false, error: 'roomId is required' })

    const [materials, stats] = await Promise.all([
      CourseMaterial.find({ roomId }).sort({ createdAt: -1 }).lean(),
      getRoomRagStats(roomId)
    ])

    res.json({
      success: true,
      materials,
      stats
    })
  } catch (err) {
    console.error('[RAG Materials Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch course materials' })
  }
})

/**
 * DELETE /api/rag/materials/:id
 * Delete a course material and remove its vector chunks from the RAG store.
 */
router.delete('/materials/:id', authorize('teacher'), requireApprovedTeacher, async (req, res) => {
  try {
    const material = await CourseMaterial.findById(req.params.id)
    if (!material) return res.status(404).json({ success: false, error: 'Material not found' })

    const room = await Room.findById(material.roomId)
    if (!room || room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this material' })
    }

    await deleteMaterialChunks(material._id)
    await CourseMaterial.findByIdAndDelete(material._id)

    res.json({ success: true, message: 'Material and vector chunks removed successfully' })
  } catch (err) {
    console.error('[RAG Delete Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to delete course material' })
  }
})

/**
 * POST /api/rag/search
 * Semantic search query across indexed course materials and lecture transcripts.
 */
router.post('/search', async (req, res) => {
  try {
    const { roomId, query, docTypes, topK = 5 } = req.body
    if (!roomId || !query) {
      return res.status(400).json({ success: false, error: 'roomId and query are required' })
    }

    const results = await querySimilarChunks(query, roomId, {
      topK: Math.min(topK, 20),
      docTypes: docTypes || ['course_material', 'previous_lecture', 'current_lecture'],
      minScore: 0.05
    })

    res.json({
      success: true,
      query,
      count: results.length,
      results
    })
  } catch (err) {
    console.error('[RAG Search Error]:', err)
    res.status(500).json({ success: false, error: 'Semantic search failed' })
  }
})

/**
 * POST /api/rag/generate-questions
 * Generate RAG-enhanced questions (MCQ, Coding, Concept) fusing lecture transcripts, course materials, and learning profiles.
 */
router.post('/generate-questions', authorize('teacher'), requireApprovedTeacher, async (req, res) => {
  try {
    const {
      roomId,
      currentTranscript = '',
      searchTopic = '',
      category = 'MCQ', // 'MCQ' | 'CODING' | 'CONCEPT' | 'MIXED'
      difficulty = 'medium',
      numQuestions = 2,
      includeCourseMaterials = true,
      includePreviousLectures = true,
      provider = 'google'
    } = req.body

    if (!roomId) {
      return res.status(400).json({ success: false, error: 'roomId is required' })
    }

    const result = await generateRagQuestions({
      roomId,
      currentTranscript,
      searchTopic,
      category,
      difficulty,
      numQuestions: Math.min(Math.max(1, numQuestions), 10),
      includeCourseMaterials,
      includePreviousLectures,
      provider
    })

    res.json({
      success: true,
      questions: result.questions,
      contextSummary: result.contextSummary,
      retrievedChunksCount: result.retrievedChunks?.length || 0,
      weakConceptsTargeted: result.weakConcepts || []
    })
  } catch (err) {
    console.error('[RAG Question Gen Error]:', err)
    res.status(500).json({ success: false, error: err.message || 'Failed to generate RAG questions' })
  }
})

/**
 * POST /api/rag/index-lecture
 * Manually or automatically index a lecture transcript segment into the RAG vector store.
 */
router.post('/index-lecture', authorize('teacher'), requireApprovedTeacher, async (req, res) => {
  try {
    const { roomId, transcriptId, text, segmentIndex, docType } = req.body
    if (!roomId || !text) {
      return res.status(400).json({ success: false, error: 'roomId and text are required' })
    }

    const chunks = await indexLectureTranscript({
      roomId,
      transcriptId,
      text,
      segmentIndex: segmentIndex || 0,
      docType: docType || 'current_lecture'
    })

    res.json({ success: true, indexedChunksCount: chunks?.length || 0 })
  } catch (err) {
    console.error('[RAG Index Lecture Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to index lecture transcript' })
  }
})

/**
 * GET /api/rag/student-profile/:studentId/:roomId
 * Get student's Adaptive Learning Progress Score (ALPS), detected weak concepts, and personalized RAG recommendations.
 */
router.get('/student-profile/:studentId/:roomId', async (req, res) => {
  try {
    const { studentId, roomId } = req.params
    const currentUser = req.user

    if (currentUser.role === 'student' && currentUser._id.toString() !== studentId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view other students learning profiles' })
    }

    // Trigger on-demand analysis if needed
    let profile = await StudentLearningProfile.findOne({ studentId, roomId }).lean()
    if (!profile) {
      profile = await analyzeStudentPerformance(studentId, roomId)
    }

    res.json({
      success: true,
      profile
    })
  } catch (err) {
    console.error('[RAG Student Profile Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch student learning profile' })
  }
})

/**
 * POST /api/rag/analyze-student
 * Trigger recalculation of student ALPS score, weak concept detection, and personalized study recommendations.
 */
router.post('/analyze-student', async (req, res) => {
  try {
    const { studentId, roomId } = req.body
    const targetStudentId = studentId || req.user._id
    if (!roomId) return res.status(400).json({ success: false, error: 'roomId is required' })

    const profile = await analyzeStudentPerformance(targetStudentId, roomId)
    res.json({ success: true, profile })
  } catch (err) {
    console.error('[RAG Analyze Error]:', err)
    res.status(500).json({ success: false, error: 'Performance analysis failed' })
  }
})

/**
 * GET /api/rag/class-analytics/:roomId
 * Teacher analytics dashboard view: Class ALPS, weak concepts heatmap, and material indexing stats.
 */
router.get('/class-analytics/:roomId', authorize('teacher'), async (req, res) => {
  try {
    const { roomId } = req.params
    const room = await Room.findById(roomId)
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' })
    if (room.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' })
    }

    const [classAnalytics, ragStats] = await Promise.all([
      getClassRagAnalytics(roomId),
      getRoomRagStats(roomId)
    ])

    res.json({
      success: true,
      analytics: classAnalytics,
      ragStats
    })
  } catch (err) {
    console.error('[RAG Class Analytics Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch class RAG analytics' })
  }
})

/**
 * GET /api/rag/student-feedback/:roomId
 * Current authenticated student fetches their personalized lesson feedback;
 * Teacher fetches comprehensive class-wide lesson feedback & analytics
 */
router.get('/student-feedback/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params
    const currentUser = req.user

    if (currentUser.role === 'teacher') {
      const classAnalytics = await getClassRagAnalytics(roomId)
      return res.json({
        success: true,
        isTeacherOverview: true,
        ...classAnalytics
      })
    }

    const feedbackData = await getStudentLessonFeedback(currentUser._id, roomId)
    res.json({
      success: true,
      ...feedbackData
    })
  } catch (err) {
    console.error('[RAG Student Feedback Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to generate student lesson feedback' })
  }
})

/**
 * GET /api/rag/student-feedback/:roomId/:studentId
 * Teacher (or student for themselves) fetches personalized lesson feedback for a specific student
 */
router.get('/student-feedback/:roomId/:studentId', async (req, res) => {
  try {
    const { roomId, studentId } = req.params
    const currentUser = req.user

    if (currentUser.role === 'student' && currentUser._id.toString() !== studentId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view other students feedback' })
    }

    const feedbackData = await getStudentLessonFeedback(studentId, roomId)
    res.json({
      success: true,
      ...feedbackData
    })
  } catch (err) {
    console.error('[RAG Specific Student Feedback Error]:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch student lesson feedback' })
  }
})

export default router
