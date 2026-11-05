import React, { useState, useEffect } from 'react'
import LpsDonut from '../components/LpsDonut.jsx'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useSocketStore from '../stores/socketStore'
import useRoomStore from '../stores/roomStore'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import ProfileDropdown from '../components/ProfileDropdown'
import RandomQuestionModal from '../components/RandomQuestionModal.jsx'
import { API_URL } from '../config.js'
import useIsMobile from '../hooks/useIsMobile'

function StudentDashboard() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const { socket, isConnected, joinRoom, leaveRoom } = useSocketStore()
  const { activeRooms, joinRoomByCode, setAuthToken, fetchActiveRooms } = useRoomStore()
  
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [stats, setStats] = useState({
    totalRooms: 0,
    pollsTaken: 0,
    pollsMissed: 0,
    average: 0
  })
  const [studentLps, setStudentLps] = useState(0) // overall ALPS
  const [weakConceptsSummary, setWeakConceptsSummary] = useState([])

  useEffect(() => {
    if (token) {
      setAuthToken(token)
      fetchStudentStats()
      fetchActiveRooms()
    }
  }, [token])

  // Fetch student ALPS for each active room and compute average & extract weak concepts
  useEffect(() => {
    if (token && activeRooms && activeRooms.length > 0) {
      const fetchStudentLps = async () => {
        try {
          const lpsVals = []
          const weakList = []
          for (const room of activeRooms) {
            try {
              const res = await fetch(`${API_URL}/rag/student-profile/${user._id}/${room._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              const data = await res.json()
              if (data.success && data.profile) {
                if (typeof data.profile.alps === 'number') {
                  lpsVals.push(data.profile.alps)
                }
                if (data.profile.weakConcepts?.length) {
                  data.profile.weakConcepts.forEach(w => {
                    if (!weakList.includes(w.concept)) weakList.push(w.concept)
                  })
                }
              }
            } catch {
              // fallback
            }
          }
          const avg = lpsVals.length ? Math.round(lpsVals.reduce((a, b) => a + b, 0) / lpsVals.length) : 0
          setStudentLps(avg)
          setWeakConceptsSummary(weakList.slice(0, 4))
        } catch (err) {
          console.error('Failed to fetch student ALPS:', err)
          setStudentLps(0)
        }
      }
      fetchStudentLps()
    }
  }, [token, activeRooms, user])

  const fetchStudentStats = async () => {
    try {
      const res = await fetch(`${API_URL}/responses/stats/student/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.stats) {
        setStats({
          totalRooms: data.stats.totalRooms || 0,
          pollsTaken: data.stats.pollsTaken || 0,
          pollsMissed: data.stats.pollsMissed || 0,
          average: data.stats.average || 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch student stats:', err)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) return
    setIsJoining(true)
    try {
      const room = await joinRoomByCode(roomCode.trim().toUpperCase())
      joinRoom(room.code, user._id)
      navigate(`/student/session/${room.code}`)
    } catch (err) {
      console.error('Failed to join room:', err)
    } finally {
      setIsJoining(false)
    }
  }

  const statCards = [
    { icon: '📚', value: stats.totalRooms, label: 'Total Rooms', tint: '#2563eb' },
    { icon: '✅', value: stats.pollsTaken, label: 'Polls Taken', tint: '#10b981' },
    { icon: '❌', value: stats.pollsMissed, label: 'Polls Missed', tint: '#ef4444' },
    { icon: '📈', value: `${stats.average}%`, label: 'Earned Points %', tint: '#8b5cf6' }
  ]

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <Sidebar user={user} />
      <RandomQuestionModal />

      {/* Main Content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: 'var(--sidebar-width, 240px)',
        transition: 'margin-left 0.2s ease'
      }}>
        {/* Header */}
        <header style={{
          background: 'var(--header-bg)',
          color: 'white',
          padding: isMobile ? '20px 16px' : '28px 32px',
          paddingLeft: isMobile ? '64px' : '32px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                margin: 0,
                fontSize: isMobile ? '20px' : '26px',
                fontWeight: '700',
                letterSpacing: '-0.02em'
              }}>
                Welcome, {user?.name || 'Student'}!
              </h1>
              <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '14px' }}>
                Join classrooms, participate in live RAG quizzes, and track your ALPS mastery
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <ThemeToggle />
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div style={{
          flex: 1,
          padding: isMobile ? '16px' : '32px',
          maxWidth: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box'
        }}>
          {/* Top Section - Stats Cards + ALPS Gauge */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: isMobile ? '24px' : '32px'
          }}>
            {/* ALPS Card */}
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '160px'
            }}>
              <LpsDonut percentage={studentLps} size={110} label="Adaptive ALPS" />
            </div>

            {/* General Stats */}
            {statCards.map((card, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '160px'
                }}
              >
                <div style={{
                  fontSize: '28px',
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  background: `${card.tint}1a`
                }}>{card.icon}</div>
                <div style={{
                  fontSize: isMobile ? '26px' : '30px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em'
                }}>{card.value}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Adaptive Learning & Weak Concepts Banner (if available) */}
          {weakConceptsSummary.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.08))',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              marginBottom: isMobile ? '24px' : '32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Personalized RAG Study Recommendations Ready
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Identified focus areas: <strong>{weakConceptsSummary.join(', ')}</strong>. Review targeted excerpts from your course materials.
                </p>
              </div>
              <button
                onClick={() => navigate('/student/analytics')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                View Study Guide →
              </button>
            </div>
          )}

          {/* Quick Join Section */}
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: isMobile ? '20px' : '24px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            marginBottom: isMobile ? '24px' : '32px',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Quick Join
            </h2>

            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code..."
                maxLength={8}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '12px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  fontSize: '15px',
                  outline: 'none',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  letterSpacing: '2px',
                  fontWeight: '600',
                  boxSizing: 'border-box'
                }}
              />

              <button
                onClick={handleJoinRoom}
                disabled={isJoining || !roomCode.trim()}
                style={{
                  padding: '11px 24px',
                  background: (isJoining || !roomCode.trim()) ? 'var(--border-color)' : 'var(--accent-gradient)',
                  color: (isJoining || !roomCode.trim()) ? 'var(--text-secondary)' : '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: (isJoining || !roomCode.trim()) ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>

          {/* Active Joined Rooms Section */}
          {activeRooms.length > 0 && (
            <>
              <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                🟢 Previously Joined Active Rooms
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: isMobile ? '24px' : '32px'
              }}>
                {activeRooms.map((room) => (
                  <div
                    key={room._id}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-md)',
                      minHeight: '140px',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                        {room.name}
                      </h3>
                      <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Code: <strong style={{ color: 'var(--accent)', letterSpacing: '1px' }}>{room.code}</strong>
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {room.questionCount || 0} questions • {room.settings?.timeToAnswer || 30}s per question
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/student/session/${room.code}`)}
                      style={{
                        marginTop: '16px',
                        padding: '11px 18px',
                        background: 'var(--accent-gradient)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      🔄 Rejoin Room →
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard