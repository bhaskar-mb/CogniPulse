import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Check, RefreshCw, Send, Radio, ThumbsUp, Flame, Lightbulb, Rocket, Heart, Trophy, Wand2 } from 'lucide-react'
import confetti from 'canvas-confetti'

const DEMO_PRESETS = [
  {
    id: 'ai-gen',
    topic: 'Neural Networks & Deep Learning',
    question: 'Why does Layer Normalization perform better than Batch Normalization in autoregressive LLMs?',
    options: [
      { id: 'a', text: 'It normalizes activations across sequence length independent of batch size', votes: 142, correct: true },
      { id: 'b', text: 'It computes variance strictly across all GPU ranks concurrently', votes: 24, correct: false },
      { id: 'c', text: 'It completely eliminates the requirement for gradient backpropagation', votes: 9, correct: false },
      { id: 'd', text: 'It prevents dropout layers from dropping token embeddings', votes: 18, correct: false }
    ],
    explanation: 'LayerNorm normalizes across the feature dimension for each token independently, making it invariant to variable sequence lengths and mini-batch sizes.'
  },
  {
    id: 'fullstack',
    topic: 'Distributed Systems & WebSockets',
    question: 'How does Socket.IO maintain bidirectional real-time communication when WebSockets fail?',
    options: [
      { id: 'a', text: 'Automatic fallback to HTTP long-polling with reconnection queues', votes: 188, correct: true },
      { id: 'b', text: 'Spawns local WebRTC peer connections automatically', votes: 31, correct: false },
      { id: 'c', text: 'Switches to client-side IndexedDB sync buffers', votes: 15, correct: false },
      { id: 'd', text: 'Sends SMS push updates to connected student devices', votes: 4, correct: false }
    ],
    explanation: 'Socket.IO starts with HTTP long-polling and upgrades to WebSocket, falling back gracefully if intermediate proxies or firewalls block WS packets.'
  }
]

export default function LiveDemoPlayground() {
  const [activePresetIndex, setActivePresetIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [pollData, setPollData] = useState(DEMO_PRESETS[0])
  const [reactions, setReactions] = useState([])
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  useEffect(() => {
    setPollData(DEMO_PRESETS[activePresetIndex])
    setSelectedOption(null)
    setHasVoted(false)
  }, [activePresetIndex])

  const totalVotes = pollData.options.reduce((acc, opt) => acc + opt.votes, 0) + (hasVoted ? 1 : 0)

  const handleVote = (optionId) => {
    if (hasVoted) return
    setSelectedOption(optionId)
    setHasVoted(true)

    // Trigger mini celebration
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    })
  }

  const addReaction = (emoji) => {
    const newId = Date.now() + Math.random()
    const xOffset = Math.floor(Math.random() * 80) - 40
    setReactions((prev) => [...prev, { id: newId, emoji, x: xOffset }])

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newId))
    }, 2000)
  }

  const handleSimulateAi = (e) => {
    e.preventDefault()
    setIsGeneratingAi(true)
    setTimeout(() => {
      setIsGeneratingAi(false)
      const topicName = customPrompt.trim() || 'Quantum Computing & Qubits'
      setPollData({
        id: 'custom-' + Date.now(),
        topic: topicName,
        question: `Generated Question: How does quantum superposition enable exponential state representation in ${topicName}?`,
        options: [
          { id: 'a', text: 'N qubits represent 2^N orthogonal states simultaneously in Hilbert space', votes: 85, correct: true },
          { id: 'b', text: 'By clocking quantum gates at superluminal frequencies', votes: 12, correct: false },
          { id: 'c', text: 'Through classical bit interleaving caches in cryogenic RAM', votes: 8, correct: false }
        ],
        explanation: 'Due to linear superposition, an N-qubit quantum state is represented as a unit vector in a 2^N dimensional complex Hilbert space.'
      })
      setSelectedOption(null)
      setHasVoted(false)
      setCustomPrompt('')
    }, 1200)
  }

  return (
    <section id="demo" className="py-24 relative overflow-hidden bg-gray-50/60 dark:bg-gray-900/40 border-y border-gray-200/70 dark:border-gray-800/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try It Live in Your Browser</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white"
          >
            Experience the <span className="text-gradient">CogniPulse Flow</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300"
          >
            Cast your live response below to see instant spring-animated bar transitions, live feedback, and real-time comprehension scoring.
          </motion.p>
        </div>

        {/* Interactive Sandbox Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Controls & AI Prompt Bar */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Topic Switcher Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg shadow-black/5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                1. Select Demo Question Preset
              </h4>
              <div className="space-y-2">
                {DEMO_PRESETS.map((preset, idx) => (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActivePresetIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                      activePresetIndex === idx
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    <span>{preset.topic}</span>
                    {activePresetIndex === idx && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* AI Generation Simulator */}
            <div className="bg-gradient-to-br from-indigo-900 via-blue-950 to-purple-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="glow-bubble-1 -top-20 -right-20 opacity-30 pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Wand2 className="w-4 h-4 text-indigo-300" />
                <span>Instant AI Question Generator</span>
              </div>
              <h3 className="text-base font-bold mb-2">Generate Polls From Any Lecture Topic</h3>
              <p className="text-xs text-indigo-200/80 mb-4">
                Type any curriculum concept or paste lecture notes to synthesize high-yield quiz questions with distractor options.
              </p>

              <form onSubmit={handleSimulateAi} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Docker containerization vs VMs..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-300/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isGeneratingAi}
                  type="submit"
                  className="w-full shimmer-btn py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-900" />
                      <span>Synthesizing Question...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Generate Instant Question</span>
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* Live Reaction Emojis */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Live Emojis:
              </span>
              <div className="flex items-center gap-2">
                {[
                  { icon: '🔥', label: 'fire' },
                  { icon: '💡', label: 'idea' },
                  { icon: '🚀', label: 'rocket' },
                  { icon: '❤️', label: 'love' },
                  { icon: '👏', label: 'clap' }
                ].map((item) => (
                  <motion.button
                    key={item.label}
                    whileHover={{ scale: 1.25, rotate: 10 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => addReaction(item.icon)}
                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    {item.icon}
                  </motion.button>
                ))}
              </div>
            </div>

          </div>

          {/* Right: Live Interactive Question & Results Stage */}
          <div className="lg:col-span-7 relative">
            
            {/* Floating floating emoji bubbles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              <AnimatePresence>
                {reactions.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 1, y: 300, x: 250 + r.x, scale: 0.8 }}
                    animate={{ opacity: 0, y: -50, x: 250 + r.x * 2, scale: 1.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    className="absolute text-3xl"
                  >
                    {r.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.div
              layout
              className="bg-white dark:bg-gray-800/90 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-gray-700 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              {/* Question Header & Live Status */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {pollData.topic}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                    {hasVoted ? 'Results Broadcast' : 'Tap an Option to Vote'}
                  </span>
                </div>
              </div>

              {/* Main Question Text */}
              <div className="my-6">
                <h3 className="text-lg sm:text-xl font-bold font-display text-gray-900 dark:text-white leading-relaxed">
                  {pollData.question}
                </h3>
              </div>

              {/* Interactive Poll Options */}
              <div className="space-y-3.5">
                {pollData.options.map((option, idx) => {
                  const effectiveVotes = option.votes + (selectedOption === option.id ? 1 : 0)
                  const percentage = Math.round((effectiveVotes / totalVotes) * 100)
                  const isSelected = selectedOption === option.id

                  return (
                    <motion.div
                      key={option.id}
                      whileHover={!hasVoted ? { scale: 1.015, x: 4 } : {}}
                      whileTap={!hasVoted ? { scale: 0.98 } : {}}
                      onClick={() => handleVote(option.id)}
                      className={`relative overflow-hidden rounded-2xl p-4 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500/30'
                          : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-750'
                      }`}
                    >
                      {/* Animated Result Progress Bar with Motion spring */}
                      {hasVoted && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                          className={`absolute inset-y-0 left-0 ${
                            option.correct
                              ? 'bg-emerald-500/20 dark:bg-emerald-500/25 border-r-2 border-emerald-500'
                              : isSelected
                              ? 'bg-blue-500/20 dark:bg-blue-500/25 border-r-2 border-blue-500'
                              : 'bg-gray-200/50 dark:bg-gray-700/30 border-r border-gray-400'
                          }`}
                        />
                      )}

                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span
                            className={`text-sm font-medium leading-relaxed ${
                              isSelected
                                ? 'text-blue-950 dark:text-blue-100 font-bold'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {option.text}
                          </span>
                        </div>

                        {hasVoted && (
                          <div className="shrink-0 flex flex-col items-end">
                            <span
                              className={`text-sm font-extrabold ${
                                option.correct
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isSelected
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {percentage}%
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {effectiveVotes} votes
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Reveal Explanation if voted */}
              <AnimatePresence>
                {hasVoted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
                  >
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Conceptual Breakdown</span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                      {pollData.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom footer with reset & total stats */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span>{totalVotes} Total Participant Responses</span>
                </div>
                {hasVoted && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedOption(null)
                      setHasVoted(false)
                    }}
                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset & Try Again</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
