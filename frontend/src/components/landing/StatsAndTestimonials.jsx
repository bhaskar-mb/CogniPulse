import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Star, MessageSquare, Award, TrendingUp, Users, Zap, PenLine, Clock } from 'lucide-react'
import TestimonialSubmitModal from './TestimonialSubmitModal'
import useAuthStore from '../../stores/authStore'

// ── Animated counter ──────────────────────────────────────────────────────────
function useCountUp(target, duration = 1800, start = false) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (!start || target === 0) return
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, start])
  return display
}

function StatCard({ label, rawValue, suffix, change, icon: Icon, idx, ready }) {
  const [inView, setInView] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const count = useCountUp(rawValue, 1800, inView && ready)
  const formatted = ready ? count.toLocaleString() + suffix : null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: idx * 0.1 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200/80 dark:border-gray-700 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
          {change}
        </span>
      </div>
      {formatted ? (
        <div className="text-3xl sm:text-4xl font-extrabold font-display text-gray-900 dark:text-white tracking-tight">
          {formatted}
        </div>
      ) : (
        <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
      {ready && (
        <span className="absolute top-4 right-4 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
    </motion.div>
  )
}

// ── Testimonial card ──────────────────────────────────────────────────────────
function TestimonialCard({ item, idx }) {
  const initials = item.displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: idx * 0.15 }}
      whileHover={{ y: -6 }}
      className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200/80 dark:border-gray-700 shadow-xl flex flex-col justify-between relative"
    >
      <div>
        <div className="flex items-center gap-1 mb-4 text-amber-400">
          {[...Array(item.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-amber-400" />
          ))}
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed italic">
          "{item.content}"
        </p>
      </div>
      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
          {initials}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.displayName}</h4>
          {item.displayRole && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.displayRole}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty state placeholder card ──────────────────────────────────────────────
function EmptyTestimonialCard({ idx, onSubmit, isLoggedIn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: idx * 0.15 }}
      className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-300 dark:border-gray-600 shadow-md flex flex-col items-center justify-center text-center min-h-[200px]"
    >
      <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
        Be the first to share your experience!
      </p>
      {isLoggedIn ? (
        <button
          onClick={onSubmit}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Write a testimonial →
        </button>
      ) : (
        <p className="text-xs text-gray-400">Log in to submit your review</p>
      )}
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StatsAndTestimonials() {
  const [liveStats, setLiveStats] = useState(null)
  const [statsReady, setStatsReady] = useState(false)
  const [testimonials, setTestimonials] = useState([])
  const [testimonialsReady, setTestimonialsReady] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const { user } = useAuthStore()

  // Fetch real platform stats
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.questions === 'number') {
          setLiveStats(data)
          setStatsReady(true)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch approved testimonials
  const fetchTestimonials = () => {
    fetch('/api/testimonials')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.testimonials)) {
          setTestimonials(data.testimonials)
          setTestimonialsReady(true)
        }
      })
      .catch(() => { setTestimonialsReady(true) })
  }

  useEffect(() => { fetchTestimonials() }, [])

  const stats = [
    { label: 'Live Polls Synthesized', rawValue: liveStats?.questions ?? 0, suffix: '+', change: 'Real-time from DB', icon: Zap },
    { label: 'Active Students Engaged', rawValue: liveStats?.students ?? 0, suffix: '+', change: '99.9% uptime', icon: Users },
    { label: 'Total Responses Collected', rawValue: liveStats?.responses ?? 0, suffix: '+', change: 'across all sessions', icon: TrendingUp },
    { label: 'Sessions Hosted', rawValue: liveStats?.rooms ?? 0, suffix: '+', change: 'and counting', icon: Award },
  ]

  // Show up to 3 testimonial slots — pad with empty cards if fewer than 3
  const displayCards = testimonials.slice(0, 3)
  const emptySlots = Math.max(0, 3 - displayCards.length)

  return (
    <section id="analytics" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Live badge */}
        {statsReady && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live stats — pulled from database right now
            </span>
          </motion.div>
        )}

        {/* Metric Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {stats.map((stat, idx) => (
            <StatCard key={stat.label} {...stat} idx={idx} ready={statsReady} />
          ))}
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Real User Feedback</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white"
          >
            Trusted by <span className="text-gradient">Forward-Thinking Academics</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-sm text-gray-500 dark:text-gray-400"
          >
            These are real testimonials from real CogniPulse users.
          </motion.p>

          {/* Submit button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            {user ? (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <PenLine className="w-4 h-4" />
                Share your experience
              </button>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                <a href="/auth" className="text-blue-500 hover:underline font-medium">Log in</a> to submit your testimonial
              </p>
            )}
          </motion.div>
        </div>

        {/* Testimonials grid */}
        {testimonialsReady ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {displayCards.map((item, idx) => (
              <TestimonialCard key={item._id} item={item} idx={idx} />
            ))}
            {[...Array(emptySlots)].map((_, i) => (
              <EmptyTestimonialCard
                key={`empty-${i}`}
                idx={displayCards.length + i}
                onSubmit={() => setModalOpen(true)}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        ) : (
          /* Skeleton while loading */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200/80 dark:border-gray-700 shadow-xl animate-pulse min-h-[220px]">
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => <div key={j} className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />)}</div>
                <div className="space-y-2 mb-6"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" /></div>
                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700"><div className="w-11 h-11 rounded-2xl bg-gray-200 dark:bg-gray-700" /><div className="space-y-1"><div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" /><div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></div></div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Testimonial submit modal */}
      <TestimonialSubmitModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          fetchTestimonials() // refresh after submit
        }}
      />
    </section>
  )
}
