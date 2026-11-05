import React from 'react'

function WeakConceptView({ profile, isTeacher = false }) {
  if (!profile) return null

  const weakConcepts = profile.weakConcepts || []
  const recommendations = profile.recommendations || []
  const metrics = profile.metrics || {}

  const getMasteryBadge = (level) => {
    switch (level) {
      case 'needs_review':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', text: 'Needs Review' }
      case 'developing':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', text: 'Developing' }
      case 'proficient':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', text: 'Proficient' }
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', text: 'Mastered' }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ALPS Breakdown Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        <div style={{
          background: 'var(--bg-primary)',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACCURACY</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
            {Math.round((metrics.accuracy || 0) * 100)}%
          </div>
        </div>

        <div style={{
          background: 'var(--bg-primary)',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>RESPONSE SPEED</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
            {metrics.avgResponseTime ? `${metrics.avgResponseTime}s` : 'N/A'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-primary)',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>DIFFICULTY LEVEL</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6', marginTop: '2px' }}>
            {Math.round((metrics.difficultyScore || 0) * 100)}%
          </div>
        </div>

        <div style={{
          background: 'var(--bg-primary)',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ATTENDANCE</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
            {Math.round((metrics.attendance || 0) * 100)}%
          </div>
        </div>
      </div>

      {/* Teacher Formative Note */}
      {profile.lessonFeedback?.teacherNote && (
        <div style={{
          background: 'color-mix(in srgb, #3b82f6 8%, transparent)',
          border: '1px solid color-mix(in srgb, #3b82f6 24%, transparent)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '18px' }}>👨‍🏫</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lesson Feedback Note
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.5 }}>
              {profile.lessonFeedback.teacherNote}
            </div>
          </div>
        </div>
      )}

      {/* Weak Concepts Detection */}
      <div>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎯</span> {isTeacher ? 'Detected Weak Concepts' : 'Your Focus Areas & Weak Concepts'}
        </h3>

        {weakConcepts.length === 0 ? (
          <div style={{
            padding: '16px',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            🌟 Great performance! No critical weak concepts identified so far.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {weakConcepts.map((wc, idx) => {
              const badge = getMasteryBadge(wc.masteryLevel)
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{wc.concept}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      fontWeight: 700
                    }}>
                      {badge.text}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Errors: {wc.errorCount} / {wc.totalAttempts} attempts ({Math.round((wc.accuracy || 0) * 100)}% accuracy)
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Personalized RAG Retrieval Recommendations */}
      <div>
        <h3 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📖</span> Personalized RAG Study Excerpts & Recommendations
        </h3>

        {recommendations.length === 0 ? (
          <div style={{
            padding: '16px',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'center'
          }}>
            No review recommendations needed right now. Keep up the great work!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  padding: '16px',
                  background: 'var(--bg-primary)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px' }}>📌</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#3b82f6' }}>{rec.concept}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Source: {rec.sourceTitle || 'Lecture Material'}
                  </span>
                </div>

                {/* Excerpt */}
                <div style={{
                  padding: '10px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  fontStyle: 'italic'
                }}>
                  "{rec.excerpt}"
                </div>

                {/* Actionable Advice */}
                {rec.actionableAdvice && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡</span>
                    <span>{rec.actionableAdvice}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WeakConceptView
