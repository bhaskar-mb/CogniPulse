import mongoose from 'mongoose'

const ragChunkSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel',
    default: null
  },
  sourceModel: {
    type: String,
    enum: ['CourseMaterial', 'Transcript'],
    default: 'CourseMaterial'
  },
  docType: {
    type: String,
    enum: ['course_material', 'previous_lecture', 'current_lecture'],
    required: true
  },
  sourceTitle: {
    type: String,
    default: ''
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  cleanedText: {
    type: String,
    default: ''
  },
  tokenCount: {
    type: Number,
    default: 0
  },
  // Vector embedding (array of floats, e.g. 768 or 384 dimensions)
  embedding: {
    type: [Number],
    default: []
  },
  concepts: [{
    type: String
  }],
  metadata: {
    page: { type: Number },
    section: { type: String },
    segmentIndex: { type: Number },
    speaker: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Compound index for querying chunks by room and document type
ragChunkSchema.index({ roomId: 1, docType: 1, chunkIndex: 1 })
ragChunkSchema.index({ sourceId: 1 })

const RagChunk = mongoose.model('RagChunk', ragChunkSchema)

export default RagChunk
