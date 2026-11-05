import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, ArrowRight, Play, CheckCircle2, Zap, Users, Trophy, BarChart2, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'

export default function HeroSection({ onOpenAuth, onJoinRoom }) {
  const navigate = useNavigate()
  const [quickRoomCode, setQuickRoomCode] = useState('')
  const [activeReaction, setActiveReaction] = useState(null)

  const handleTriggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    })
  }

  const handleQuickJoin = (e) => {
    e.preventDefault()
    if (!quickRoomCode.trim()) return
    navigate(`/student/room/${quickRoomCode.trim().toUpperCase()}`)
  }

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background glowing orbs */}
      <div className="glow-bubble-1 top-10 left-1/2 -translate-x-1/2 opacity-70 dark:opacity-40" />
      <div className="glow-bubble-2 -bottom-20 right-10 opacity-60 dark:opacity-30" />
      <div className="dot-grid opacity-30 dark:opacity-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left">
            
            {/* Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm shadow-blue-500/10"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Next-Gen Interactive Polling & AI Question Engine</span>
            </motion.div>

            {/* Main Headline with Motion */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display leading-[1.15]"
            >
              Turn Every Lecture Into an{' '}
              <span className="text-gradient">Active Brainstorm.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal"
            >
              Generate high-retention questions in seconds with Whisper audio AI, broadcast live socket polls, and monitor real-time class comprehension with zero friction.
            </motion.p>

            {/* Quick Actions / Join Bar */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth ? onOpenAuth(false) : navigate('/login')}
                className="w-full sm:w-auto shimmer-btn px-7 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 text-base"
              >
                <span>Host a Free Session</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {/* Quick Student PIN Join input */}
              <form onSubmit={handleQuickJoin} className="w-full sm:w-auto flex items-center bg-white dark:bg-gray-800 rounded-2xl p-1.5 border border-gray-300 dark:border-gray-700 shadow-lg shadow-black/5">
                <input
                  type="text"
                  placeholder="Enter 6-char Room PIN"
                  value={quickRoomCode}
                  onChange={(e) => setQuickRoomCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="px-3 py-2 text-sm font-semibold tracking-wider text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none w-44 placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Join
                </motion.button>
              </form>
            </motion.div>

            {/* Highlights checklist */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Instant Whisper AI Transcription</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Sub-100ms Socket Synchronization</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Student Account Required</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Live Floating Interactive Demo Card */}
          <div className="lg:col-span-5 relative">
            
            {/* Floating micro badges */}
            <motion.div
              animate={{ y: [-6, 6, -6], rotate: [0, 2, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-6 -left-4 z-20 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-700/80 shadow-xl"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">Live Socket Sync</p>
                <p className="text-[9px] text-emerald-600 font-medium">98 Connected Students</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [6, -6, 6], rotate: [0, -2, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-6 -right-2 z-20 hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-700/80 shadow-xl cursor-pointer"
              onClick={handleTriggerConfetti}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-500">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-100">Live Top Rank</p>
                <p className="text-[9px] text-amber-600 font-medium">Click to celebrate 🎉</p>
              </div>
            </motion.div>

            {/* Interactive Preview Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="gradient-border-card p-6 sm:p-7 shadow-2xl backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/90 relative"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Room #AI-409
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  ACTIVE POLL
                </span>
              </div>

              {/* Sample Live Question */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Question 3 of 5</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">00:14s remaining</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  Which mechanism allows Transformers to weigh dependencies across arbitrary token distances?
                </h3>
              </div>

              {/* Poll Options with Motion.dev dynamic fill */}
              <div className="mt-4 space-y-2.5">
                {[
                  { label: 'Multi-Head Self-Attention', percent: 74, correct: true, votes: 72 },
                  { label: 'Recurrent Hidden States', percent: 14, correct: false, votes: 14 },
                  { label: 'Max Pooling Layers', percent: 12, correct: false, votes: 12 }
                ].map((opt, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700/80 p-3 bg-gray-50/70 dark:bg-gray-800/50 cursor-pointer"
                  >
                    {/* Animated Fill Bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${opt.percent}%` }}
                      transition={{ duration: 1.2, delay: 0.3 + idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute top-0 bottom-0 left-0 ${
                        opt.correct
                          ? 'bg-blue-500/15 dark:bg-blue-500/25 border-r-2 border-blue-500'
                          : 'bg-gray-200/50 dark:bg-gray-700/40 border-r border-gray-400'
                      }`}
                    />

                    <div className="relative z-10 flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-200">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={opt.correct ? 'text-blue-950 dark:text-blue-100 font-bold' : 'text-gray-700 dark:text-gray-300'}>
                          {opt.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          {opt.votes} votes
                        </span>
                        <span className={`font-bold ${opt.correct ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {opt.percent}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom live stats */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>98 responses collected</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span>92% comprehension</span>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
