import mongoose from 'mongoose'

const courseMaterialSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'pptx', 'txt', 'md', 'other'],
    default: 'pdf'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['processing', 'indexed', 'failed'],
    default: 'processing'
  },
  description: {
    type: String,
    default: ''
  },
  topics: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Index for efficient room querying
courseMaterialSchema.index({ roomId: 1, createdAt: -1 })

const CourseMaterial = mongoose.model('CourseMaterial', courseMaterialSchema)

export default CourseMaterial
