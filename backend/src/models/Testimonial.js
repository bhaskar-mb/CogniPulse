import mongoose from 'mongoose'

const testimonialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Snapshot of name/role at time of submission (user may update profile later)
  displayName: { type: String, required: true, maxlength: 100 },
  displayRole: { type: String, default: '', maxlength: 150 },
  content: {
    type: String,
    required: true,
    minlength: [20, 'Testimonial must be at least 20 characters'],
    maxlength: [400, 'Testimonial cannot exceed 400 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    default: 5
  },
  // Admin approves before it appears on landing page
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: { type: Date, default: null }
}, { timestamps: true })

// One testimonial per user
testimonialSchema.index({ user: 1 }, { unique: true })

const Testimonial = mongoose.model('Testimonial', testimonialSchema)
export default Testimonial
