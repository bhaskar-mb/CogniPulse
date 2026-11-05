import React, { useState, useEffect } from 'react'
import { API_URL } from '../config.js'
import useAuthStore from '../stores/authStore'

function StudentLessonFeedback({ roomId, studentId = null, isTeacher = false }) {
  const { token, user } = useAuthStore()
  const [feedbackData, setFeedbackData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const effectiveStudentId = studentId || user?._id

  useEffect(() => {
    if (!roomId || !token) return
    fetchFeedback()
  }, [roomId, effectiveStudentId, token])

  const fetchFeedback = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endpoint = isTeacher && studentId
        ? `${API_URL}/rag/student-feedback/${roomId}/${studentId}`
        : `${API_URL}/rag/student-feedback/${roomId}`

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setFeedbackData(data)
      } else {
        setError(data.error || 'Feedback currently generating. Click retry in a moment.')
      }
    } catch (err) {
      console.error('[StudentLessonFeedback] Error:', err)
      setError('Could not connect to feedback service')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{
        padding: '24px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div style={{ fontWeight: 600 }}>Synthesizing lesson feedback from teacher's session...</div>
      </div>
    )
  }

  if (error || !feedbackData) {
    return (
      <div style={{
        padding: '20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '6px' }}>💡</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Lesson Feedback & Mastery Insights</div>
        <p style={{ fontSize: '12px', margin: '4px 0 12px', color: 'var(--text-secondary)' }}>
          {error || 'Analyzing lecture session questions and responses...'}
        </p>
        <button
          onClick={fetchFeedback}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Feedback
        </button>
      </div>
    )
  }

  // TEACHER OVERVIEW VIEW
  if (feedbackData.isTeacherOverview) {
    const {
      averageAlps = 0,
      totalProfiles = 0,
      topWeakConcepts = [],
      studentProfiles = []
    } = feedbackData

    return (
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-md)',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📊</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Class Adaptive Learning & Weak Concept Analytics
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Aggregated performance across {totalProfiles} participating {totalProfiles === 1 ? 'student' : 'students'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Class Avg ALPS:</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{averageAlps}/100</span>
          </div>
        </div>

        {/* Top Class Weak Concepts */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> Class-wide Focus Topics & Weak Concepts
          </div>

          {topWeakConcepts.length === 0 ? (
            <div style={{
              padding: '16px',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius)',
              color: '#10b981',
              fontSize: '13px',
              textAlign: 'center',
              fontWeight: 600
            }}>
              🌟 Outstanding class performance! No major weak concepts detected across this lecture.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {topWeakConcepts.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{item.concept}</span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      fontWeight: 700
                    }}>
                      {item.totalErrors} {item.totalErrors === 1 ? 'error' : 'errors'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Impacts {item.studentsAffected} students ({item.impactPercentage || 0}% of class)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Profiles Summary List */}
        {studentProfiles.length > 0 && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span> Individual Student Mastery Roster
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {studentProfiles.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Accuracy: {Math.round((p.metrics?.accuracy || 0) * 100)}% • Weak Areas: {p.weakConcepts?.map(w => w.concept).slice(0, 2).join(', ') || 'None'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: (p.alps || 0) >= 75 ? '#10b981' : ((p.alps || 0) >= 50 ? '#f59e0b' : '#ef4444')
                  }}>
                    {p.alps}/100
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // STUDENT PERSONALIZED VIEW
  const { alps = 0, metrics = {}, weakConcepts = [], recommendations = [], feedback = {} } = feedbackData
  const { lessonOverview, strengths = [], weakAreas = [], teacherNote, actionItems = [] } = feedback

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      padding: '24px',
      marginBottom: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)'
            }}>
              Your Personalized Lesson Feedback & Mastery
            </h2>
          </div>
          <p style={{ margin: '4px 0 0 34px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Grounded in the teacher's lesson content, interactive responses, and concept mastery
          </p>
        </div>

        {/* ALPS Score Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
          padding: '6px 14px',
          borderRadius: '20px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>ALPS Score:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent)' }}>{alps}/100</span>
        </div>
      </div>

      {/* Lesson Overview */}
      {lessonOverview && (
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '18px' }}>📚</span>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lesson Focus
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
              {lessonOverview}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Formative Note */}
      {teacherNote && (
        <div style={{
          background: 'color-mix(in srgb, #3b82f6 8%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 24%, transparent)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '20px' }}>👨‍🏫</span>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Formative Assessment Note
            </div>
            <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5, fontWeight: 500 }}>
              {teacherNote}
            </div>
          </div>
        </div>
      )}

      {/* Strengths & Weak Areas Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Strengths Card */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '13.5px' }}>
            <span>✅</span> Mastered Concepts & Strengths
          </div>
          {strengths.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Complete more interactive questions to unlock concept strength insights.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {strengths.map((str, idx) => (
                <div key={idx} style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: '#10b981' }}>•</span> {str}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focus Areas (Weak Concepts) */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '13.5px' }}>
            <span>🎯</span> Evaluated Topic Mastery
          </div>
          {weakConcepts.length === 0 ? (
            <div style={{ fontSize: '12.5px', color: '#10b981' }}>
              🌟 Excellent performance! No critical weak areas detected in this lesson.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {weakConcepts.map((wc, idx) => (
                <div key={idx} style={{
                  padding: '8px 10px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{wc.concept}</span>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: wc.errorCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: wc.errorCount > 0 ? '#ef4444' : '#10b981',
                    fontWeight: 700
                  }}>
                    {wc.errorCount > 0 ? `${wc.errorCount} ${wc.errorCount === 1 ? 'miss' : 'misses'}` : `${Math.round((wc.accuracy || 1) * 100)}% mastery`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RAG Targeted Lesson Excerpts */}
      {recommendations.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📖</span> Targeted Excerpts from Teacher's Lesson
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{
                padding: '14px',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent)' }}>
                    📌 {rec.concept}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {rec.sourceTitle || 'Teacher Lesson Transcript'}
                  </span>
                </div>
                <div style={{
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: '6px',
                  fontStyle: 'italic',
                  border: '1px solid var(--border-color)'
                }}>
                  "{rec.excerpt}"
                </div>
                {rec.actionableAdvice && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡</span>
                    <span>{rec.actionableAdvice}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div style={{
          padding: '14px 18px',
          background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
          borderRadius: 'var(--radius)',
          border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🚀</span> Next Action Steps for Mastery
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {actionItems.map((item, idx) => (
              <div key={idx} style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{idx + 1}.</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentLessonFeedback
