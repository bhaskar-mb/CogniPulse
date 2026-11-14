import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import useThemeStore from './stores/themeStore'
import useAuthStore from './stores/authStore'
import useSocketStore from './stores/socketStore'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { API_URL, BASE_PATH } from './config.js'
import { isTokenExpired } from './lib/jwt.js'

// Lazy load route pages for high-speed initial paint
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const RoomDetailPage = lazy(() => import('./pages/RoomDetailPage'))
const StudentRoomPage = lazy(() => import('./pages/StudentRoomPage'))
const CreateRoomPage = lazy(() => import('./pages/CreateRoomPage'))
const ManageRoomPage = lazy(() => import('./pages/ManageRoomPage'))
const JoinRoomPage = lazy(() => import('./pages/JoinRoomPage'))
const RoomHistoryPage = lazy(() => import('./pages/RoomHistoryPage'))
const RoomResultsPage = lazy(() => import('./pages/RoomResultsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main, #f8fafc)',
      fontFamily: 'Outfit, system-ui, sans-serif'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '3px solid rgba(99, 102, 241, 0.15)',
        borderTopColor: '#6366f1',
        animation: 'cpAppSpin 0.8s linear infinite'
      }} />
      <style>{`@keyframes cpAppSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginTop: '16px', fontSize: '14px', fontWeight: '700', color: '#6366f1', letterSpacing: '0.5px' }}>
        CogniPulse
      </div>
    </div>
  )
}

function App() {
  const { isDark } = useThemeStore()
  const { token, isAuthenticated, setAuth } = useAuthStore()
  const { connect, disconnect } = useSocketStore()
  const [samagamaChecked, setSamagamaChecked] = useState(false)

  // On load, if the persisted token is already expired (e.g. the app was opened from a bookmark with a
  // cached session), drop it immediately so the user lands on the login screen with a clear message
  // instead of a logged-in-looking UI that only fails when they try to answer. This backs up the
  // onRehydrateStorage check in authStore for any timing edge.
  useEffect(() => {
    const { token: t } = useAuthStore.getState()
    if (t && isTokenExpired(t)) {
      useAuthStore.getState().handleSessionExpired()
    }
  }, [])

  // Check for Samagama session on app load
  useEffect(() => {
    if (isAuthenticated || samagamaChecked) return

    const checkSamagamaSession = async () => {
      try {
        const samagamaToken = localStorage.getItem('samagama_auth_token')
        console.log('[CogniPulse] Samagama token found:', !!samagamaToken)

        if (!samagamaToken) {
          setSamagamaChecked(true)
          return
        }

        const response = await fetch('https://samagama.in/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${samagamaToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          setSamagamaChecked(true)
          return
        }

        const data = await response.json()
        const samagamaUser = data.user
        console.log('[CogniPulse] Samagama user:', samagamaUser?.email)

        if (!samagamaUser || !samagamaUser.email) {
          setSamagamaChecked(true)
          return
        }

        // Send the Samagama token to the CogniPulse backend, which re-verifies it
        // server-side and provisions the account from the identity Samagama returns.
        // We deliberately do not send email/name/admin flags — the server does not trust them.
        const cognipulseResponse = await fetch(`${API_URL}/auth/samagama-auto-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ samagamaToken })
        })

        if (!cognipulseResponse.ok) {
          setSamagamaChecked(true)
          return
        }

        const cognipulseData = await cognipulseResponse.json()
        setAuth(cognipulseData.user, cognipulseData.token)

        // Open dashboard in new tab
        const dashboard = cognipulseData.user.role === 'teacher' ? '/teacher' : '/student'
        const redirectUrl = `${window.location.origin}${BASE_PATH}${dashboard}`
        console.log('[CogniPulse] Opening dashboard:', redirectUrl)
        window.open(redirectUrl, '_blank')
      } catch (error) {
        console.error('[CogniPulse] Samagama session check failed:', error)
      } finally {
        setSamagamaChecked(true)
      }
    }

    checkSamagamaSession()
  }, [isAuthenticated, samagamaChecked, setAuth])

  // Connect socket when user is authenticated with valid token
  useEffect(() => {
    if (token && isAuthenticated) {
      console.log('App: connecting socket with token')
      connect(token)
    } else {
      console.log('App: disconnecting socket')
      disconnect()
    }
  }, [token, isAuthenticated, connect, disconnect])

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [isDark])

  return (
    <ErrorBoundary message="Unable to load page. Please refresh to try again.">
      <BrowserRouter basename={BASE_PATH}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/create-room" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CreateRoomPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/manage-room" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <ManageRoomPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/profile" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/room-history" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <RoomHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/room/:roomId" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <RoomDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/room/:roomId/results" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <RoomResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/teacher/analytics" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/help" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <HelpPage />
              </ProtectedRoute>
            } />
            {/* Admin-only: teacher approval page. Guarded to teachers here and to isAdmin inside the page + API. */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AdminPage />
              </ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/join-room" element={
              <ProtectedRoute allowedRoles={['student']}>
                <JoinRoomPage />
              </ProtectedRoute>
            } />
            <Route path="/student/help" element={
              <ProtectedRoute allowedRoles={['student']}>
                <HelpPage />
              </ProtectedRoute>
            } />
            <Route path="/student/room-history" element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoomHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/student/analytics" element={
              <ProtectedRoute allowedRoles={['student']}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/profile" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/student/room/:roomId/results" element={
              <ProtectedRoute allowedRoles={['student']}>
                <RoomResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/student/session/:roomCode" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentRoomPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App