import React, { useState, useEffect } from 'react'
import { API_URL } from '../config.js'
import useAuthStore from '../stores/authStore'

const UNDERSTANDING_OPTIONS = [
  { id: 'clear', label: '🌟 Crystal Clear', desc: 'Understood everything thoroughly' },
  { id: 'mostly_clear', label: '👍 Mostly Understood', desc: 'Grasped core concepts well' },
  { id: 'neutral', label: '🤔 Neutral', desc: 'Understood some parts' },
  { id: 'difficult', label: '❓ Needs More Detail', desc: 'Found some concepts difficult' }
]

const PACE_OPTIONS = [
  { id: 'too_slow', label: '🐢 Too Slow', icon: '🐢' },
  { id: 'just_right', label: '🎯 Just Right', icon: '🎯' },
  { id: 'too_fast', label: '⚡ Too Fast', icon: '⚡' }
]

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Fair',
  3: 'Good Lesson',
  4: 'Great Class!',
  5: 'Outstanding Session! 🚀'
}

function StudentClassFeedback({ roomId, isTeacher = false }) {
  const { token, user } = useAuthStore()

  // Student State
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [understanding, setUnderstanding] = useState('mostly_clear')
  const [pace, setPace] = useState('just_right')
  const [favoriteTopic, setFavoriteTopic] = useState('')
  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Teacher / Stats State
  const [statsData, setStatsData] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    if (!roomId || !token) return

    if (isTeacher) {
      fetchStats()
    } else {
      fetchMyFeedback()
    }
  }, [roomId, token, isTeacher])

  const fetchMyFeedback = async () => {
    try {
      const res = await fetch(`${API_URL}/feedback/room/${roomId}/my`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.feedback) {
        setRating(data.feedback.rating || 5)
        setUnderstanding(data.feedback.understanding || 'mostly_clear')
        setPace(data.feedback.pace || 'just_right')
        setFavoriteTopic(data.feedback.favoriteTopic || '')
        setComment(data.feedback.comment || '')
        setIsAnonymous(!!data.feedback.isAnonymous)
        setHasSubmitted(true)
        setIsEditing(false)
      }
    } catch (err) {
      console.warn('[StudentClassFeedback] Could not load prior feedback:', err.message)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchStats = async () => {
    setIsLoadingStats(true)
    try {
      const res = await fetch(`${API_URL}/feedback/room/${roomId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.stats) {
        setStatsData(data.stats)
      }
    } catch (err) {
      console.error('[StudentClassFeedback] Failed to load stats:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch(`${API_URL}/feedback/room/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          understanding,
          pace,
          favoriteTopic,
          comment,
          isAnonymous
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setHasSubmitted(true)
        setIsEditing(false)
        setMessage({ type: 'success', text: '🎉 Thank you! Your feedback has been sent to the teacher.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit feedback' })
      }
    } catch (err) {
      console.error('[StudentClassFeedback] Submit error:', err)
      setMessage({ type: 'error', text: 'Network error submitting feedback' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // TEACHER STATS VIEW
  if (isTeacher) {
    if (isLoadingStats) {
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
          <div>⏳ Loading student class feedback & reviews...</div>
        </div>
      )
    }

    const {
      totalCount = 0,
      averageRating = 0,
      ratingsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      paceBreakdown = { too_slow: 0, just_right: 0, too_fast: 0 },
      feedbacks = []
    } = statsData || {}

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
            <span style={{ fontSize: '24px' }}>⭐</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Student Class Feedback & Ratings
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Direct student reviews on lesson clarity, engagement, and pacing
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'color-mix(in srgb, #f59e0b 14%, transparent)',
            border: '1px solid color-mix(in srgb, #f59e0b 28%, transparent)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span style={{ fontSize: '16px', color: '#f59e0b' }}>★</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {averageRating > 0 ? `${averageRating} / 5.0` : 'No ratings yet'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              ({totalCount} {totalCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        {totalCount === 0 ? (
          <div style={{
            padding: '24px',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '13px'
          }}>
            💬 No students have submitted class feedback yet for this room.
          </div>
        ) : (
          <>
            {/* Aggregate Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Pace Card */}
              <div style={{
                padding: '14px',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Lesson Pacing Feedback
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>🎯 Just Right:</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{paceBreakdown.just_right || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>⚡ Too Fast:</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>{paceBreakdown.too_fast || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>🐢 Too Slow:</span>
                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{paceBreakdown.too_slow || 0}</span>
                </div>
              </div>

              {/* Star Rating Breakdown */}
              <div style={{
                padding: '14px',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Rating Distribution
                </div>
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = ratingsCount[stars] || 0
                  const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                  return (
                    <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ width: '28px', color: '#f59e0b', fontWeight: 600 }}>{stars}★</span>
                      <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                      </div>
                      <span style={{ width: '24px', textAlign: 'right', color: 'var(--text-secondary)' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Individual Reviews */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝</span> Student Reviews & Comments ({feedbacks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {feedbacks.map((item, idx) => {
                  const initial = (item.studentName || 'S').charAt(0).toUpperCase()
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{item.studentName}</span>
                              {item.isAnonymous && (
                                <span style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  Anonymous
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Pace: <strong>{item.pace?.replace('_', ' ')}</strong> • Clarity: <strong>{item.understanding?.replace('_', ' ')}</strong>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 700 }}>
                            {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {item.favoriteTopic && (
                        <div style={{ fontSize: '12px', color: 'var(--accent)' }}>
                          🎯 Favorite Topic: <strong>{item.favoriteTopic}</strong>
                        </div>
                      )}

                      {item.comment ? (
                        <div style={{
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          lineHeight: 1.45,
                          padding: '10px 12px',
                          background: 'var(--bg-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontStyle: 'italic'
                        }}>
                          "{item.comment}"
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // STUDENT INTERACTIVE VIEW
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
      gap: '18px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⭐</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              How was today's class?
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Give your teacher direct feedback to help improve future lectures
            </p>
          </div>
        </div>

        {hasSubmitted && !isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11.5px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontWeight: 700
            }}>
              ✓ Feedback Submitted
            </span>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                padding: '4px 10px',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          {message.text}
        </div>
      )}

      {hasSubmitted && !isEditing ? (
        /* Summary of Submitted Feedback */
        <div style={{
          padding: '16px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#f59e0b', fontSize: '20px' }}>
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
              ({rating}/5 - {RATING_LABELS[rating]})
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12.5px' }}>
            <span style={{ padding: '3px 8px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              Pace: <strong>{PACE_OPTIONS.find(p => p.id === pace)?.label || pace}</strong>
            </span>
            <span style={{ padding: '3px 8px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              Understanding: <strong>{UNDERSTANDING_OPTIONS.find(u => u.id === understanding)?.label || understanding}</strong>
            </span>
            {favoriteTopic && (
              <span style={{ padding: '3px 8px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                Favorite Topic: <strong>{favoriteTopic}</strong>
              </span>
            )}
          </div>

          {comment && (
            <div style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              padding: '10px 12px',
              background: 'var(--bg-card)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontStyle: 'italic'
            }}>
              "{comment}"
            </div>
          )}
        </div>
      ) : (
        /* Interactive Feedback Form */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Star Rating */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              1. Rate Today's Overall Lecture
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star
                  return (
                    <span
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      style={{
                        fontSize: '28px',
                        color: isFilled ? '#f59e0b' : 'var(--border-color)',
                        transition: 'transform 0.15s ease, color 0.15s ease',
                        transform: (hoverRating || rating) === star ? 'scale(1.15)' : 'scale(1)',
                        userSelect: 'none'
                      }}
                    >
                      ★
                    </span>
                  )
                })}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', marginLeft: '6px' }}>
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* 2. Pace & Understanding Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px'
          }}>
            {/* Pacing */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                2. Teacher's Pace
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PACE_OPTIONS.map(opt => {
                  const isSelected = pace === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPace(opt.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                        background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-primary)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Understanding */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                3. Clarity & Understanding
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {UNDERSTANDING_OPTIONS.map(opt => {
                  const isSelected = understanding === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUnderstanding(opt.id)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                        background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-primary)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 3. Favorite Topic Input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              4. Which topic was most interesting or clear today? <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Binary Search, Architecture trade-offs, React state..."
              value={favoriteTopic}
              onChange={(e) => setFavoriteTopic(e.target.value)}
              maxLength={100}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 4. Comments / Suggestions Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              5. Comments or Questions for the Teacher <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Share what went well or anything you'd like the teacher to review in the next class..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Student Identity and Anonymous Toggle & Submit Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '4px',
            padding: '10px 12px',
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <span>👤 Submitting as:</span>
              <strong style={{ color: 'var(--accent)' }}>{isAnonymous ? 'Anonymous' : (user?.name || 'Student')}</strong>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>Hide my name</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>

            <div style={{ display: 'flex', gap: '8px' }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSubmitting ? 'Submitting...' : (hasSubmitted ? '💾 Update Feedback' : '🚀 Submit Feedback')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default StudentClassFeedback
