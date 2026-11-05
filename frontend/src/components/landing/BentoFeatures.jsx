import React from 'react'
import { motion } from 'motion/react'
import { 
  Sparkles, 
  Mic, 
  Radio, 
  Trophy, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Cpu, 
  FileText, 
  Flame, 
  CheckCircle2 
} from 'lucide-react'

export default function BentoFeatures() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  }

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & Capabilities</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white"
          >
            Engineered for <span className="text-gradient">Maximum Engagement</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300"
          >
            Everything educators and students need for frictionless active learning, instant comprehension checks, and automated quiz authoring.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          
          {/* Card 1: AI Audio Whisper & Question Synthesis (Large 8 cols) */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-8 bg-gradient-to-br from-blue-900 via-indigo-950 to-gray-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden border border-blue-800/40 group"
          >
            <div className="glow-bubble-1 -top-20 -right-20 opacity-40 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 mb-6 shadow-inner">
                <Mic className="w-6 h-6 text-blue-300 animate-pulse" />
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Transformers AI Pipeline
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold font-display mt-3 mb-3">
                Whisper Audio Transcription & Auto Question Generation
              </h3>

              <p className="text-blue-100/80 text-sm sm:text-base max-w-xl leading-relaxed">
                Speak naturally or upload lecture recordings. Our on-device & server transformer pipeline generates instant multiple-choice and conceptual questions with verified distractors on the fly.
              </p>

              {/* Animated waveform visual preview */}
              <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-4">
                <div className="flex items-center gap-1 h-8">
                  {[40, 70, 90, 60, 30, 85, 95, 45, 65, 80, 50, 75, 90, 40, 60].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [`${h * 0.4}%`, `${h}%`, `${h * 0.4}%`] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                      className="w-1 bg-gradient-to-t from-blue-400 to-indigo-300 rounded-full"
                    />
                  ))}
                </div>
                <div className="flex-1 text-xs text-blue-200">
                  <p className="font-semibold">Transcribing lecture stream...</p>
                  <p className="text-blue-300/70 text-[11px]">3 high-yield questions generated in 1.4s</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Ultra Fast Socket.IO (4 cols) */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Sub-100ms Latency
            </span>

            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mt-3 mb-2">
              Real-Time Socket Synchrony
            </h3>

            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Every vote, timer tick, question reveal, and approval broadcasts instantly to thousands of student devices without page reloads.
            </p>

            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Bi-directional WebSocket streaming</span>
            </div>
          </motion.div>

          {/* Card 3: Dynamic Gamification & Leaderboards (4 cols) */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mb-6">
              <Trophy className="w-6 h-6" />
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Engagement Loops
            </span>

            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mt-3 mb-2">
              Live Leaderboards & Streaks
            </h3>

            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Reward speed and accuracy with real-time scoreboards, answer streaks, and celebratory confetti boosts.
            </p>

            <div className="mt-6 space-y-2">
              {[
                { name: 'Sarah K.', points: '2,450 pts', streak: '🔥 5 streak' },
                { name: 'Alex M.', points: '2,320 pts', streak: '🔥 4 streak' }
              ].map((student, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750 text-xs">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{student.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-500">{student.points}</span>
                    <span className="text-[10px] text-gray-500">{student.streak}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 4: AI-Powered Quiz Generation (4 cols) */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-purple-500" />
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              AI-Powered
            </span>

            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mt-3 mb-2">
              AI-Powered Quiz Generation
            </h3>

            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Automatically generate high-quality MCQs, polls, and open-ended questions from any topic or lecture content in seconds.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">MCQ generated</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">3 in 1.4s</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Accuracy score</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">98.2%</span>
              </div>
            </div>
          </motion.div>

          {/* Card 5: Secure Login & Pin Access (4 cols) */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-4 bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
            </div>

            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Role-Based Access
            </span>

            <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mt-3 mb-2">
              Secure JWT Login &amp; Pin Access
            </h3>

            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Zero registration friction for students via instant room PINs, with encrypted JWT authentication and role-based teacher/student access control.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>Encrypted JWT &amp; secure sessions</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>Full compliance &amp; CSV export</span>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  )
}
