import mongoose from 'mongoose'

const studentLearningProfileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  // Adaptive Learning Progress Score (0-100)
  alps: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metrics: {
    accuracy: { type: Number, default: 0 }, // 0 to 1
    avgResponseTime: { type: Number, default: 0 }, // seconds
    speedScore: { type: Number, default: 0 }, // 0 to 1 (faster correct answers score higher)
    difficultyScore: { type: Number, default: 0 }, // 0 to 1 (weighted by question difficulty)
    attendance: { type: Number, default: 0 }, // 0 to 1
    totalAnswered: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 }
  },
  weakConcepts: [{
    concept: { type: String, required: true },
    errorCount: { type: Number, default: 1 },
    totalAttempts: { type: Number, default: 1 },
    accuracy: { type: Number, default: 0 }, // 0 to 1
    masteryLevel: { type: String, enum: ['needs_review', 'developing', 'proficient', 'mastered'], default: 'needs_review' },
    lastMissedAt: { type: Date, default: Date.now }
  }],
  // Personalized RAG study retrieval recommendations
  recommendations: [{
    concept: { type: String, required: true },
    sourceTitle: { type: String, default: '' },
    docType: { type: String, default: 'course_material' },
    excerpt: { type: String, required: true },
    actionableAdvice: { type: String, default: '' },
    relevanceScore: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now }
  }],
  // Score history for tracking progress over time
  history: [{
    timestamp: { type: Date, default: Date.now },
    alps: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }
  }],
  // Personalized feedback based on teacher's lesson content and student responses
  lessonFeedback: {
    lessonOverview: { type: String, default: '' },
    strengths: [{ type: String }],
    weakAreas: [{ type: String }],
    teacherNote: { type: String, default: '' },
    actionItems: [{ type: String }],
    generatedAt: { type: Date, default: Date.now }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

studentLearningProfileSchema.index({ studentId: 1, roomId: 1 }, { unique: true })
studentLearningProfileSchema.index({ roomId: 1, alps: -1 })

const StudentLearningProfile = mongoose.model('StudentLearningProfile', studentLearningProfileSchema)

export default StudentLearningProfile
