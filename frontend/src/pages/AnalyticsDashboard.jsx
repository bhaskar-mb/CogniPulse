import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config.js'
import useAuthStore from '../stores/authStore'
import useRoomStore from '../stores/roomStore'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import ProfileDropdown from '../components/ProfileDropdown'
import LpsDonut from '../components/LpsDonut'
import WeakConceptView from '../components/WeakConceptView'
import StudentClassFeedback from '../components/StudentClassFeedback'
import useSocketStore from '../stores/socketStore'
import { fetchClassRagAnalytics, fetchStudentRagProfile } from '../services/ragService'

// Simple reusable bar chart using pure SVG
function LpsBarChart({ distribution, maxStudents }) {
  const buckets = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100']
  const barWidth = 36
  const gap = 8
  const chartHeight = 160
  const maxVal = maxStudents || Math.max(...Object.values(distribution || {}), 1)

  return (
    <svg width={(barWidth + gap) * buckets.length + 40} height={chartHeight + 40} style={{ overflow: 'visible' }}>
      {buckets.map((label, i) => {
        const key = i * 10
        const count = distribution?.[key] || 0
        const barH = maxVal > 0 ? (count / maxVal) * chartHeight : 0
        const x = i * (barWidth + gap) + 30
        const y = chartHeight - barH
        return (
          <g key={label}>
            <rect
              x={x} y={y} width={barWidth} height={barH}
              rx={4} ry={4}
              fill="url(#barGrad)"
              style={{ transition: 'height 0.5s ease, y 0.5s ease' }}
            />
            <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
              {label}
            </text>
            {count > 0 && (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle"
                style={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                {count}
              </text>
            )}
          </g>
        )
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Student row in the table
function StudentRow({ rank, name, lps, accuracy, responseTime, attendance, weakCount, weakConcepts = [], recommendations = [], lessonFeedback }) {
  const getLpsColor = (val) => {
    if (val >= 80) return '#10b981'
    if (val >= 60) return '#3b82f6'
    if (val >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const hasWeakAreas = Array.isArray(weakConcepts) && weakConcepts.length > 0
  const masteredTopics = lessonFeedback?.strengths || []

  return (
    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
      <td style={tdStyle}>{rank}</td>
      <td style={{ ...tdStyle, fontWeight: 600 }}>{name}</td>
      <td style={tdStyle}>
        <span style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
          background: `${getLpsColor(lps)}18`, color: getLpsColor(lps), fontWeight: 700, fontSize: 13
        }}>
          {lps}
        </span>
      </td>
      <td style={tdStyle}>{accuracy ? `${Math.round(accuracy * 100)}%` : '0%'}</td>
      <td style={tdStyle}>{responseTime ? `${responseTime}s` : 'N/A'}</td>
      <td style={tdStyle}>{attendance ? `${Math.round(attendance * 100)}%` : '0%'}</td>
      <td style={tdStyle}>
        {hasWeakAreas ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {weakConcepts.slice(0, 3).map((wc, idx) => (
              <span
                key={idx}
                title={`${wc.concept}: ${wc.errorCount || 1} errors (${Math.round((wc.accuracy || 0) * 100)}% accuracy)`}
                style={{
                  padding: '3px 8px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#dc2626',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>⚠️</span> {wc.concept || 'Needs Review'}
              </span>
            ))}
            {weakConcepts.length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                +{weakConcepts.length - 3} more
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              padding: '3px 10px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontSize: '11.5px',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>🌟</span> {masteredTopics[0] ? `Mastered: ${masteredTopics[0]}` : 'All Concepts Mastered (100%)'}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

const tdStyle = {
  padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', textAlign: 'left'
}

const thStyle = {
  padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
  textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px',
  borderBottom: '2px solid var(--border-color)'
}

function AnalyticsDashboard() {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const { rooms, fetchRooms, setAuthToken } = useRoomStore()

  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [classStats, setClassStats] = useState(null)
  const [studentMetrics, setStudentMetrics] = useState([])
  const [ragAnalytics, setRagAnalytics] = useState(null)
  const [studentRagProfile, setStudentRagProfile] = useState(null)
  const [ragStats, setRagStats] = useState(null)
  const [activeTab, setActiveTab] = useState('alps') // 'alps' | 'weak_concepts' | 'rag_knowledge'
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const isTeacher = user?.role === 'teacher'
  const socket = useSocketStore(state => state.socket)

  useEffect(() => {
    if (token) {
      setAuthToken(token)
      fetchRooms()
    }
    setChecked(true)
  }, [token])

  useEffect(() => {
    if (checked && !token) navigate('/')
  }, [checked, token, navigate])

  // Auto-select first room
  useEffect(() => {
    if (rooms?.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0]._id)
    }
  }, [rooms])

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !selectedRoomId || !rooms?.length) return

    const selectedRoom = rooms.find(r => r._id === selectedRoomId)
    if (!selectedRoom?.code) return

    const handleUpdate = () => {
      setRefreshTrigger(prev => prev + 1)
    }

    socket.on('points:updated', handleUpdate)
    socket.on('response:new', handleUpdate)
    socket.on('question:ended', handleUpdate)

    return () => {
      socket.off('points:updated', handleUpdate)
      socket.off('response:new', handleUpdate)
      socket.off('question:ended', handleUpdate)
    }
  }, [socket, selectedRoomId, rooms])

  // Fetch analytics when room changes
  useEffect(() => {
    if (!selectedRoomId || !token) return
    const fetchData = async () => {
      setLoading(true)
      try {
        if (isTeacher) {
          // 1. Fetch Class RAG & ALPS Analytics
          try {
            const ragData = await fetchClassRagAnalytics(selectedRoomId, token)
            setRagAnalytics(ragData.analytics)
            setRagStats(ragData.ragStats)
            setClassStats({
              average: ragData.analytics?.averageAlps || 0,
              min: ragData.analytics?.minAlps || 0,
              max: ragData.analytics?.maxAlps || 0,
              distribution: ragData.analytics?.distribution || {},
              totalStudents: ragData.analytics?.totalProfiles || 0
            })
            setStudentMetrics(ragData.analytics?.studentProfiles || [])
          } catch (ragErr) {
            console.warn('Falling back to legacy analytics:', ragErr.message)
            // Fallback to legacy endpoints
            const classRes = await fetch(`${API_URL}/analytics/class/${selectedRoomId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            const classData = await classRes.json()
            if (classData.success) setClassStats(classData.stats)
          }
        } else {
          // Student view: fetch own RAG profile & ALPS metrics
          try {
            const profile = await fetchStudentRagProfile(user._id, selectedRoomId, token)
            setStudentRagProfile(profile)
            setStudentMetrics([{
              id: user._id,
              name: user.name,
              lps: profile?.alps || 0,
              accuracy: profile?.metrics?.accuracy || 0,
              responseTime: profile?.metrics?.avgResponseTime || 0,
              attendance: profile?.metrics?.attendance || 0,
              participation: profile?.metrics?.attendance || 0,
              weakCount: profile?.weakConcepts?.length || 0
            }])
          } catch (profErr) {
            console.warn('Student profile fallback:', profErr.message)
          }
        }
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedRoomId, token, refreshTrigger, isTeacher, user])

  const avgLps = classStats?.average || (studentMetrics.length === 1 ? studentMetrics[0]?.lps : 0) || 0

  if (!checked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--border-color)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <Sidebar user={user} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 'var(--sidebar-width, 240px)' }}>
        {/* Header */}
        <header style={{ background: 'var(--header-bg)', color: 'white', padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>📈 Adaptive Learning & RAG Analytics</h1>
              <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 14 }}>
                {isTeacher ? 'Real-time ALPS tracking, Weak Concept Detection, and Knowledge Base Insights' : 'Your Adaptive Learning Progress Score (ALPS) and Study Guide'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ThemeToggle />
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: 32 }}>
          {/* Room selector */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: '20px 24px', marginBottom: 24,
            boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 16
          }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Select Room:
            </label>
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10, border: '2px solid var(--border-color)',
                background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                cursor: 'pointer'
              }}
            >
              {!rooms?.length && <option value="">No rooms available</option>}
              {rooms?.map(r => (
                <option key={r._id} value={r._id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { id: 'alps', label: '📊 ALPS Performance' },
              { id: 'weak_concepts', label: '🎯 Weak Concept Detection' },
              { id: 'feedback', label: '⭐ Student Feedback & Reviews' },
              ...(isTeacher ? [{ id: 'rag_knowledge', label: '📚 RAG Knowledge Base' }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: activeTab === tab.id ? 'none' : '1px solid var(--border-color)',
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'var(--bg-card)',
                  color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
              <div style={{ width: 40, height: 40, border: '4px solid var(--border-color)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p>Analyzing classroom performance...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ALPS Performance */}
              {activeTab === 'alps' && (
                <>
                  {/* Top metrics row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 28 }}>
                    {/* ALPS Donut */}
                    <div style={{
                      background: 'var(--bg-card)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                    }}>
                      <LpsDonut percentage={avgLps} size={140} label={isTeacher ? 'Class Avg ALPS' : 'Your ALPS Score'} />
                    </div>

                    {/* Stat cards */}
                    {isTeacher && classStats && (
                      <>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{classStats.totalStudents}</div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Total Students</div>
                        </div>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{classStats.max}</div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Highest ALPS</div>
                        </div>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📉</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{classStats.min}</div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Lowest ALPS</div>
                        </div>
                      </>
                    )}

                    {!isTeacher && studentRagProfile && (
                      <>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                            {Math.round((studentRagProfile.metrics?.accuracy || 0) * 100)}%
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Accuracy</div>
                        </div>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
                            {studentRagProfile.metrics?.avgResponseTime ? `${studentRagProfile.metrics.avgResponseTime}s` : 'N/A'}
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Avg Speed</div>
                        </div>
                        <div style={statCardStyle}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>
                            {Math.round((studentRagProfile.metrics?.attendance || 0) * 100)}%
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Attendance</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Distribution chart (teacher only) */}
                  {isTeacher && classStats?.distribution && (
                    <div style={{
                      background: 'var(--bg-card)', borderRadius: 16, padding: 24, marginBottom: 28,
                      boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                    }}>
                      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                        📊 Adaptive Learning Progress Score (ALPS) Distribution
                      </h2>
                      <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                        <LpsBarChart distribution={classStats.distribution} maxStudents={classStats.totalStudents} />
                      </div>
                    </div>
                  )}

                  {/* Student-wise breakdown table (teacher) */}
                  {isTeacher && studentMetrics.length > 0 && (
                    <div style={{
                      background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                      boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                    }}>
                      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                        🎓 Student-wise ALPS & Concept Mastery Breakdown
                      </h2>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>#</th>
                              <th style={thStyle}>Student</th>
                              <th style={thStyle}>ALPS</th>
                              <th style={thStyle}>Accuracy</th>
                              <th style={thStyle}>Speed</th>
                              <th style={thStyle}>Attendance</th>
                              <th style={thStyle}>Weak Areas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentMetrics.map((s, i) => (
                              <StudentRow
                                key={s.studentId || s.id || i}
                                rank={i + 1}
                                name={s.name}
                                lps={s.alps || s.lps || 0}
                                accuracy={s.metrics?.accuracy || s.accuracy || 0}
                                responseTime={s.metrics?.avgResponseTime || s.responseTime || 0}
                                attendance={s.metrics?.attendance || s.attendance || 0}
                                weakCount={s.weakConceptsCount ?? (s.weakConcepts?.length || 0)}
                                weakConcepts={s.weakConcepts || []}
                                recommendations={s.recommendations || []}
                                lessonFeedback={s.lessonFeedback}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Student personal view */}
                  {!isTeacher && studentRagProfile && (
                    <div style={{
                      background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                      boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                    }}>
                      <WeakConceptView profile={studentRagProfile} isTeacher={false} />
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: Weak Concept Detection */}
              {activeTab === 'weak_concepts' && (
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                  boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                }}>
                  {isTeacher ? (
                    <div>
                      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        🎯 Classroom Weak Concept Detection Heatmap
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        The Weak Concept Detection Engine analyzes errors across all classroom responses to identify topics that require revision or targeted RAG question generation.
                      </p>

                      {ragAnalytics?.topWeakConcepts?.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                          {ragAnalytics.topWeakConcepts.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#ef4444' }}>{item.concept}</span>
                                <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                                  {item.impactPercentage}% class affected
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Total Errors Recorded: <strong>{item.totalErrors}</strong> across {item.studentsAffected} students
                              </div>
                              <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>
                                💡 Tip: Launch a RAG Concept quiz targeting "{item.concept}" in the live room.
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                          🌟 No critical weak concepts identified across the classroom!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        📖 Your Weak Concepts & Personalized RAG Retrieval Recommendations
                      </h2>
                      <WeakConceptView profile={studentRagProfile} isTeacher={false} />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RAG Knowledge Base (Teacher) */}
              {activeTab === 'rag_knowledge' && isTeacher && (
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 16, padding: 24,
                  boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)'
                }}>
                  <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    📚 Classroom RAG Knowledge Base Summary
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Overview of indexed course materials, lecture chunks, and vector database status for this room.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={statCardStyle}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{ragStats?.totalChunks || 0}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Vector Chunks</div>
                    </div>
                    <div style={statCardStyle}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{ragStats?.materialsCount || 0}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Course Materials</div>
                    </div>
                    <div style={statCardStyle}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>
                        {(ragStats?.countsByType?.current_lecture || 0) + (ragStats?.countsByType?.previous_lecture || 0)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Lecture Segments</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Student Feedback & Ratings */}
              {activeTab === 'feedback' && (
                <div>
                  <StudentClassFeedback roomId={selectedRoomId} isTeacher={isTeacher} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const statCardStyle = {
  background: 'var(--bg-card)', borderRadius: 16, padding: 24,
  boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
}

export default AnalyticsDashboard
