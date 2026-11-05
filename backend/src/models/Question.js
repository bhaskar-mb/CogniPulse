import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  type: {
    type: String,
    enum: ['MCQ', 'TF', 'MSQ', 'CODING', 'CONCEPT'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  }],
  explanation: {
    type: String,
    default: ''
  },
  // Optional code snippet for CODING type questions
  codeSnippet: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  conceptTags: [{
    type: String
  }],
  segmentIndex: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  timeToAnswer: {
    type: Number,
    default: 30
  },
  points: {
    type: Number,
    default: 10
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closeAt: {
    type: Date,
    default: null
  }
})

// Covers the hot query shapes: filter by room (+status) and sort by createdAt.
// Without this every question read (poll load, stats, history) is a full COLLSCAN.
questionSchema.index({ roomId: 1, status: 1, createdAt: -1 })

const Question = mongoose.model('Question', questionSchema)

export default Question