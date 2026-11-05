import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  GraduationCap, 
  UserCheck, 
  Sparkles, 
  ArrowRight, 
  PlusCircle, 
  Radio, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Award, 
  BarChart2, 
  Play 
} from 'lucide-react'

export default function RoleComparison({ onOpenAuth }) {
  const [activeRole, setActiveRole] = useState('teacher')

  const teacherFeatures = [
    {
      title: 'One-Click Room Creation',
      desc: 'Spawn an encrypted live room with automatic 6-character room codes and QR sharing in under 3 seconds.',
      icon: PlusCircle,
      tag: 'Speed'
    },
    {
      title: 'Whisper AI Question Synthesis',
      desc: 'Feed text notes or speak into your mic to produce vetted multiple-choice questions with balanced distractors.',
      icon: Sparkles,
      tag: 'AI Powered'
    },
    {
      title: 'Question Approval Workflow',
      desc: 'Review, edit, randomize, or instantly broadcast questions with configurable response countdowns.',
      icon: CheckCircle2,
      tag: 'Control'
    },
    {
      title: 'Real-Time Response Telemetry',
      desc: 'Watch live answer distributions flow in real time and export session history to CSV with full analytics.',
      icon: BarChart2,
      tag: 'Analytics'
    }
  ]

  const studentFeatures = [
    {
      title: 'Zero Account Friction',
      desc: 'Join any active room simply by entering a PIN or scanning a QR code with any mobile browser.',
      icon: UserCheck,
      tag: 'Instant Join'
    },
    {
      title: 'Spring-Animated Response UI',
      desc: 'Enjoy fluid, haptic-style tap feedback, live countdown rings, and clean readable typography.',
      icon: Radio,
      tag: 'Interactive'
    },
    {
      title: 'Instant Conceptual Feedback',
      desc: 'See the correct answer breakdown immediately after the poll closes to reinforce key takeaways.',
      icon: HelpCircle,
      tag: 'High Retention'
    },
    {
      title: 'Gamified Ranking & Streaks',
      desc: 'Climb the live classroom leaderboard and build question streaks with celebratory effects.',
      icon: Award,
      tag: 'Gamified'
    }
  ]

  const currentFeatures = activeRole === 'teacher' ? teacherFeatures : studentFeatures

  return (
    <section id="roles" className="py-24 relative overflow-hidden bg-gray-50/50 dark:bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Dual Experience Ecosystem</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white"
          >
            Tailored for <span className="text-gradient">Educators & Learners</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300"
          >
            Switch roles to explore how CogniPulse streamlines teaching operations while delivering an exhilarating student experience.
          </motion.p>
        </div>

        {/* Role Switcher Pill Bar with Motion layoutId */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-2xl bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-300/50 dark:border-gray-700/50 relative">
            <button
              onClick={() => setActiveRole('teacher')}
              className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-colors z-10 flex items-center gap-2 ${
                activeRole === 'teacher'
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {activeRole === 'teacher' && (
                <motion.div
                  layoutId="activeRolePill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <GraduationCap className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Teacher Experience</span>
            </button>

            <button
              onClick={() => setActiveRole('student')}
              className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-colors z-10 flex items-center gap-2 ${
                activeRole === 'student'
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {activeRole === 'student' && (
                <motion.div
                  layoutId="activeRolePill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <UserCheck className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Student Experience</span>
            </button>
          </div>
        </div>

        {/* Feature Cards Grid with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {currentFeatures.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-7 border border-gray-200/80 dark:border-gray-700 shadow-xl relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-display text-gray-900 dark:text-white mb-2">
                      {feat.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>Feature Included</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display">
              Ready to elevate your lecture engagement?
            </h3>
            <p className="text-blue-100 text-sm sm:text-base mt-2 max-w-xl">
              Create a free room right now. No credit card or lengthy setup required.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onOpenAuth ? onOpenAuth(false) : null}
            className="px-8 py-4 rounded-2xl bg-white text-blue-900 font-extrabold text-sm uppercase tracking-wider shadow-xl hover:bg-blue-50 transition-colors shrink-0 flex items-center gap-2"
          >
            <span>Get Started Now</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  )
}
