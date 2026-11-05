import React, { useState } from 'react'
import { generateRagQuestions } from '../services/ragService'

function RagQuestionModal({
  isOpen,
  onClose,
  roomId,
  currentTranscript = '',
  token,
  onLaunchQuestions
}) {
  const [category, setCategory] = useState('MCQ') // 'MCQ' | 'CODING' | 'CONCEPT' | 'MIXED'
  const [searchTopic, setSearchTopic] = useState('')
  const [numQuestions, setNumQuestions] = useState(2)
  const [difficulty, setDifficulty] = useState('medium')
  const [includeMaterials, setIncludeMaterials] = useState(true)
  const [includePrevLectures, setIncludePrevLectures] = useState(true)
  const [provider, setProvider] = useState('google')

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [contextSummary, setContextSummary] = useState(null)
  const [weakConceptsTargeted, setWeakConceptsTargeted] = useState([])
  const [error, setError] = useState('')

  const handleGenerate = async (e) => {
    e.preventDefault()
    setIsGenerating(true)
    setError('')
    setGeneratedQuestions([])

    try {
      const result = await generateRagQuestions({
        roomId,
        currentTranscript,
        searchTopic,
        category,
        difficulty,
        numQuestions: Number(numQuestions),
        includeCourseMaterials: includeMaterials,
        includePreviousLectures: includePrevLectures,
        provider
      }, token)

      setGeneratedQuestions(result.questions || [])
      setContextSummary(result.contextSummary || null)
      setWeakConceptsTargeted(result.weakConceptsTargeted || [])
    } catch (err) {
      setError(err.message || 'Failed to generate RAG questions')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveAndLaunch = (questionsToLaunch) => {
    if (onLaunchQuestions && questionsToLaunch.length > 0) {
      onLaunchQuestions(questionsToLaunch)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        width: '100%',
        maxWidth: '880px',
        maxHeight: '90vh',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(59, 130, 246, 0.08))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #065f46, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white'
            }}>
              ⚡
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Adaptive Classroom RAG Question Generator</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Fuse Course Materials, Transcripts, and Student Learning Profiles to create targeted assessments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Configuration Form */}
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Category Selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                1. Select Question Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'MCQ', label: '🎯 Multiple Choice', desc: 'Standard 4-option MCQs' },
                  { id: 'CODING', label: '💻 Coding Questions', desc: 'Code analysis & bug spotting' },
                  { id: 'CONCEPT', label: '💡 Concept Questions', desc: 'Deep conceptual reasoning' },
                  { id: 'MIXED', label: '🔀 Mixed Types', desc: 'Adaptive combination' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `2px solid ${category === cat.id ? '#0d9488' : 'var(--border-color)'}`,
                      background: category === cat.id ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: category === cat.id ? '#0d9488' : 'inherit' }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {cat.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Context Fusion Toggles & Search */}
            <div style={{
              background: 'var(--bg-primary)',
              padding: '16px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)'
            }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                2. Context Fusion Sources & Focus
              </label>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                  />
                  <span>📚 Course Materials (PDFs/DOCXs)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={includePrevLectures}
                    onChange={(e) => setIncludePrevLectures(e.target.checked)}
                  />
                  <span>🎙️ Previous Lectures & Transcripts</span>
                </label>
              </div>

              <div>
                <input
                  type="text"
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  placeholder="Optional: Focus topic (e.g. Asynchronous Event Loop, Recursion, Trees) or leave empty to use current transcript"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Parameters: Count & Difficulty & Provider */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Question Count
                </label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value={1}>1 Question</option>
                  <option value={2}>2 Questions</option>
                  <option value={3}>3 Questions</option>
                  <option value={4}>4 Questions</option>
                  <option value={5}>5 Questions</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="easy">Easy (Fundamentals)</option>
                  <option value="medium">Medium (Application)</option>
                  <option value="hard">Hard (Advanced / Edge Cases)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  AI Model
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="google">Gemini 2.0 Flash</option>
                  <option value="openai">OpenAI GPT-4o Mini</option>
                  <option value="anthropic">Claude 3.5 Sonnet</option>
                  <option value="minimax">MiniMax</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '10px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #065f46, #0d9488)',
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isGenerating ? '🧠 Fusing Context & Generating with RAG...' : '⚡ Generate RAG-Fused Questions'}
            </button>
          </form>

          {/* Targeted Weak Concepts notification */}
          {weakConceptsTargeted.length > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '12px',
              color: '#d97706'
            }}>
              🎯 <strong>Adaptive Targeting:</strong> Fused context automatically targeted classroom weak concepts: {weakConceptsTargeted.join(', ')}
            </div>
          )}

          {/* Generated Questions Preview & Launch */}
          {generatedQuestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Generated Questions ({generatedQuestions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => handleApproveAndLaunch(generatedQuestions)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#10b981',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Approve & Launch to Room
                </button>
              </div>

              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>
                      Q{idx + 1}. {q.question}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(124, 58, 237, 0.15)',
                      color: '#0d9488',
                      fontWeight: 700
                    }}>
                      {q.type}
                    </span>
                  </div>

                  {/* Code snippet if coding question */}
                  {q.codeSnippet && (
                    <pre style={{
                      background: 'var(--bg-card)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      overflowX: 'auto',
                      color: '#3b82f6',
                      margin: 0
                    }}>
                      <code>{q.codeSnippet}</code>
                    </pre>
                  )}

                  {/* Options */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    {q.options?.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: opt.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                          border: `1px solid ${opt.isCorrect ? '#10b981' : 'var(--border-color)'}`,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{
                          fontWeight: 700,
                          color: opt.isCorrect ? '#10b981' : 'var(--text-secondary)'
                        }}>
                          {opt.isCorrect ? '✓' : String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px' }}>
                      💡 <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-primary)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          {generatedQuestions.length > 0 && (
            <button
              onClick={() => handleApproveAndLaunch(generatedQuestions)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              🚀 Launch Questions to Class
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RagQuestionModal
