import mongoose from 'mongoose'

const classFeedbackSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  studentName: {
    type: String,
    trim: true,
    default: 'Student'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  understanding: {
    type: String,
    enum: ['clear', 'mostly_clear', 'neutral', 'difficult'],
    default: 'mostly_clear'
  },
  pace: {
    type: String,
    enum: ['too_slow', 'just_right', 'too_fast'],
    default: 'just_right'
  },
  favoriteTopic: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Ensure one feedback per student per room (upsert model)
classFeedbackSchema.index({ roomId: 1, studentId: 1 }, { unique: true })

const ClassFeedback = mongoose.model('ClassFeedback', classFeedbackSchema)

export default ClassFeedback
