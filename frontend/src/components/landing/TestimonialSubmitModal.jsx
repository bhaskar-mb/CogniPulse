import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Star, X, CheckCircle2, Loader2 } from 'lucide-react'
import { api } from '../../lib/api'

export default function TestimonialSubmitModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  // Load existing testimonial if user already submitted one
  useEffect(() => {
    if (!isOpen) return
    api.get('/testimonials/mine')
      .then(data => {
        if (data.testimonial) {
          setContent(data.testimonial.content)
          setRating(data.testimonial.rating)
        }
      })
      .catch(() => {})
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (content.trim().length < 20) {
      setErrorMsg('Please write at least 20 characters.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      await api.post('/testimonials', { content: content.trim(), rating })
      setStatus('success')
    } catch (err) {
      setErrorMsg(err.message || 'Submission failed')
      setStatus('error')
    }
  }

  const handleClose = () => {
    setStatus('idle')
    setErrorMsg('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {status === 'success' ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Thank you! 🎉
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Your testimonial has been submitted and will appear on the landing page after admin approval.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Share your experience
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Your feedback will appear on the CogniPulse landing page after approval.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Star rating */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                      Rating
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Testimonial text */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider block mb-2">
                      Your testimonial
                    </label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={4}
                      maxLength={400}
                      placeholder="Tell us how CogniPulse has helped you or your students..."
                      className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">
                      {content.length}/400
                    </p>
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {status === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : 'Submit testimonial'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
