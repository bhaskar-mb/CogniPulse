import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import useAuthStore from '../stores/authStore'
import CogniPulseIcon from '../components/CogniPulseIcon'
import PasswordInput from '../components/PasswordInput'
import useThemeStore from '../stores/themeStore'
import useIsMobile from '../hooks/useIsMobile'
import { API_URL } from '../config.js'

// Password requirements for registration
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: 'One number (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>\/?]/.test(p) },
]

function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    sendRegistrationOtp,
    verifyRegistration,
    clearError,
    sessionExpired
  } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const isMobile = useIsMobile()

  const [isLogin, setIsLogin] = useState(
    location.state?.initialLoginMode !== undefined ? location.state.initialLoginMode : true
  )
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' })
  const [validationError, setValidationError] = useState('')
  const [pendingMsg, setPendingMsg] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordMsg, setForgotPasswordMsg] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [showPasswordReqs, setShowPasswordReqs] = useState(false)
  // Email-OTP registration step: after the form is submitted we send a code and switch to OTP entry.
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [resendIn, setResendIn] = useState(0) // seconds left before "Resend" is allowed

  // Reset form data whenever login/registration mode switches
  useEffect(() => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', role: 'student' })
    setShowPasswordReqs(false)
    setValidationError('')
    setOtpSent(false)
    setOtpValue('')
    setDevOtp('')
    setResendIn(0)
  }, [isLogin])

  // Tick down the resend cooldown once per second.
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const getPasswordReqs = (password) => {
    if (password == null) return PASSWORD_REQUIREMENTS.map(req => ({ ...req, met: false }))
    return PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }))
  }

  useEffect(() => {
    if (isAuthenticated && token) {
      navigate(user?.role === 'teacher' ? '/teacher' : '/student')
    }
  }, [isAuthenticated, token, navigate, user])

  const validateForm = () => {
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match')
      return false
    }
    if (!isLogin && formData.password) {
      const failedReqs = PASSWORD_REQUIREMENTS.filter((req) => !req.test(formData.password))
      if (failedReqs.length > 0) {
        setValidationError('Password must have: ' + failedReqs.map((r) => r.label).join(', '))
        return false
      }
    }
    setValidationError('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setValidationError('')
    setPendingMsg('')

    if (!validateForm()) return

    if (isLogin) {
      try {
        const data = await login(formData.email, formData.password)
        // Navigate based on actual role from backend response, not local user state
        if (data.user?.role === 'teacher') {
          navigate('/teacher')
        } else {
          navigate('/student')
        }
      } catch (err) {
        setValidationError(err.message || 'Login failed')
      }
    } else {
      try {
        // Step 1: request an email verification code, then switch to the OTP entry screen.
        const resData = await sendRegistrationOtp(formData.name, formData.email)
        if (resData?.devOtp) {
          setDevOtp(resData.devOtp)
          if (resData.emailDelivered === false) {
            setOtpValue(resData.devOtp)
          } else {
            setOtpValue('')
          }
        } else {
          setDevOtp('')
          setOtpValue('')
        }
        setOtpSent(true)
        setResendIn(resData?.expiresInSec ? 60 : 60)
      } catch (err) {
        setValidationError(err.message || 'Failed to send verification code')
      }
    }
  }

  // Step 2: verify the emailed code and create the account (signs the user in on success).
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    clearError()
    setValidationError('')
    if (!/^\d{6}$/.test(otpValue)) {
      setValidationError('Enter the 6-digit code from your email')
      return
    }
    try {
      const data = await verifyRegistration(formData.name, formData.email, formData.password, formData.role, otpValue)
      // Teacher accounts require admin approval: no session is created. Send the registrant
      // back to the login screen with an "approval pending" message instead of a dashboard.
      if (data.pendingApproval) {
        setOtpSent(false)
        setOtpValue('')
        setDevOtp('')
        setIsLogin(true)
        setPendingMsg(data.message || 'Your teacher account is pending admin approval. You can sign in once an administrator approves it.')
        return
      }
      navigate(data.user?.role === 'teacher' ? '/teacher' : '/student')
    } catch (err) {
      setValidationError(err.message || 'Registration failed')
    }
  }

  const handleResendOtp = async () => {
    if (resendIn > 0) return
    clearError()
    setValidationError('')
    try {
      const resData = await sendRegistrationOtp(formData.name, formData.email)
      if (resData?.devOtp) {
        setDevOtp(resData.devOtp)
      }
      setResendIn(60)
    } catch (err) {
      setValidationError(err.message || 'Failed to resend code')
    }
  }

  const handleBackToForm = () => {
    setOtpSent(false)
    setOtpValue('')
    setDevOtp('')
    setValidationError('')
    clearError()
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotPasswordMsg('')
    setForgotPasswordLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email')
      setForgotPasswordMsg('Password reset link sent! Check your email.')
      setForgotPasswordEmail('')
    } catch (err) {
      setForgotPasswordMsg(err.message)
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  // ── Styles ──
  const panelBg = isDark ? '#0f172a' : '#ffffff'
  const illustrationBg = isDark
    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)'
    : 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #0ea5e9 100%)'

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
    color: isDark ? '#f1f5f9' : '#1e293b',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }
  const handleInputFocus = (e) => {
    e.target.style.borderColor = '#6366f1'
    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)'
    e.target.style.background = isDark ? 'rgba(99,102,241,0.08)' : '#fff'
  }
  const handleInputBlur = (e) => {
    e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'
    e.target.style.boxShadow = 'none'
    e.target.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: isDark ? '#94a3b8' : '#64748b',
    marginBottom: '7px',
    letterSpacing: '0.02em',
  }

  const primaryBtn = (disabled) => ({
    width: '100%',
    padding: '13px 18px',
    fontSize: '15px',
    fontWeight: '700',
    background: disabled
      ? (isDark ? 'rgba(99,102,241,0.4)' : '#c7d2fe')
      : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
    transition: 'all 0.2s',
    letterSpacing: '0.03em',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  })

  const switchBtn = {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    padding: 0,
  }

  const alertStyle = (type) => {
    const map = {
      error:   { bg: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',  border: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',  color: isDark ? '#fca5a5' : '#dc2626' },
      success: { bg: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',  border: isDark ? 'rgba(34,197,94,0.3)' : '#bbf7d0',  color: isDark ? '#86efac' : '#15803d' },
      warn:    { bg: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb', border: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a', color: isDark ? '#fcd34d' : '#b45309' },
    }
    const s = map[type] || map.error
    return { background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: s.color, fontSize: '14px' }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      background: isDark ? '#0f172a' : '#f1f5f9',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Theme toggle ── */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 50,
          background: isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)',
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
          borderRadius: '50px',
          padding: '8px 16px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          color: isDark ? '#f1f5f9' : '#1e293b',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(8px)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: '600',
        }}
      >
        <span>{isDark ? '☀️ Light' : '🌙 Dark'}</span>
      </motion.button>

      {/* ── LEFT — Form Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: isMobile ? '1' : '0 0 48%',
          maxWidth: isMobile ? '100%' : '520px',
          background: panelBg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isMobile ? '40px 24px' : '56px 60px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
          boxShadow: isDark ? '4px 0 40px rgba(0,0,0,0.4)' : '4px 0 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
            }}>
              <CogniPulseIcon size={26} color="#fff" />
            </div>
            <span style={{
              fontSize: '22px', fontWeight: '800',
              color: isDark ? '#f1f5f9' : '#1e293b',
              letterSpacing: '-0.5px',
            }}>CogniPulse</span>
          </div>
        </div>

        {/* Heading */}
        <AnimatePresence mode="wait">
          <motion.div
            key={showForgotPassword ? 'forgot' : otpSent ? 'otp' : isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{ marginBottom: '28px' }}
          >
            <h1 style={{
              fontSize: isMobile ? '26px' : '30px',
              fontWeight: '800',
              color: isDark ? '#f1f5f9' : '#0f172a',
              marginBottom: '8px',
              letterSpacing: '-0.5px',
            }}>
              {showForgotPassword ? 'Reset Password' : otpSent ? 'Check your email' : isLogin ? 'Welcome back!' : 'Create account'}
            </h1>
            <p style={{ fontSize: '15px', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>
              {showForgotPassword
                ? 'Enter your email to receive a reset link'
                : otpSent
                  ? `Enter the 6-digit code sent to ${formData.email}`
                  : isLogin
                    ? 'Sign in to continue to your dashboard'
                    : 'Join CogniPulse to start creating polls'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Alerts */}
        {sessionExpired && !validationError && !error && (
          <div style={alertStyle('warn')}>Your session expired. Please sign in again.</div>
        )}
        {pendingMsg && <div style={alertStyle('success')}>{pendingMsg}</div>}
        {(validationError || error) && (
          <div style={alertStyle('error')}>{validationError || error}</div>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="Enter your registered email"
                value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            {forgotPasswordMsg && (
              <div style={alertStyle(forgotPasswordMsg.startsWith('✓') ? 'success' : 'error')}>{forgotPasswordMsg}</div>
            )}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={forgotPasswordLoading} style={primaryBtn(forgotPasswordLoading)}>
              {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
            </motion.button>
            <button type="button" onClick={() => { setShowForgotPassword(false); setForgotPasswordMsg('') }}
              style={{ ...switchBtn, display: 'block', textAlign: 'center', marginTop: '16px', width: '100%' }}>
              ← Back to login
            </button>
          </form>

        /* ── OTP VERIFY ── */
        ) : otpSent ? (
          <form onSubmit={handleVerifyOtp}>
            <div style={{
              background: isDark ? 'rgba(99,102,241,0.1)' : '#f0f4ff',
              border: isDark ? '1px solid rgba(99,102,241,0.2)' : '1px solid #dbeafe',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#94a3b8' : '#475569', lineHeight: '1.5' }}>
                We sent a 6-digit verification code to<br />
                <strong style={{ color: isDark ? '#f8fafc' : '#1e293b' }}>{formData.email}</strong>
              </p>
              {devOtp && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '13px', color: isDark ? '#c7d2fe' : '#3730a3', fontWeight: '600' }}>
                    Code: <strong style={{ letterSpacing: '2px', fontSize: '15px' }}>{devOtp}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpValue(devOtp)}
                    style={{
                      background: '#6366f1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ ...labelStyle, textAlign: 'center', marginBottom: '12px' }}>Enter 6-Digit Code</label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const char = otpValue[index] || ''
                  return (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={char}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, '').slice(-1)
                        const chars = Array.from({ length: 6 }, (_, i) => otpValue[i] || '')
                        chars[index] = digit
                        const newStr = chars.join('').replace(/\s+$/, '')
                        setOtpValue(newStr)
                        if (digit && index < 5) {
                          const nextInput = document.getElementById(`otp-input-${index + 1}`)
                          if (nextInput) {
                            nextInput.focus()
                            nextInput.select()
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          if (!char && index > 0) {
                            const prevInput = document.getElementById(`otp-input-${index - 1}`)
                            if (prevInput) {
                              prevInput.focus()
                              const chars = Array.from({ length: 6 }, (_, i) => otpValue[i] || '')
                              chars[index - 1] = ''
                              setOtpValue(chars.join('').replace(/\s+$/, ''))
                            }
                          } else {
                            const chars = Array.from({ length: 6 }, (_, i) => otpValue[i] || '')
                            chars[index] = ''
                            setOtpValue(chars.join('').replace(/\s+$/, ''))
                          }
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault()
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                        if (pasted) {
                          setOtpValue(pasted)
                          const targetIdx = Math.min(pasted.length, 5)
                          const targetEl = document.getElementById(`otp-input-${targetIdx}`)
                          if (targetEl) targetEl.focus()
                        }
                      }}
                      autoFocus={index === 0}
                      style={{
                        width: isMobile ? '40px' : '48px',
                        height: isMobile ? '48px' : '56px',
                        fontSize: isMobile ? '20px' : '24px',
                        fontWeight: '700',
                        textAlign: 'center',
                        borderRadius: '10px',
                        border: char
                          ? '2px solid #6366f1'
                          : isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid #cbd5e1',
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                        color: isDark ? '#ffffff' : '#0f172a',
                        outline: 'none',
                        boxShadow: char ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  )
                })}
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={isLoading || otpValue.length !== 6}
              style={primaryBtn(isLoading || otpValue.length !== 6)}>
              {isLoading ? 'Verifying...' : 'Verify & Create Account'}
            </motion.button>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b' }}>
              Didn't receive it?{' '}
              <button type="button" onClick={handleResendOtp} disabled={resendIn > 0}
                style={{ ...switchBtn, opacity: resendIn > 0 ? 0.5 : 1, cursor: resendIn > 0 ? 'default' : 'pointer' }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button type="button" onClick={handleBackToForm} style={switchBtn}>← Change details</button>
            </div>
          </form>

        /* ── MAIN LOGIN / REGISTER ── */
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {!isLogin && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Enter your full name"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin} style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" placeholder="Enter your email"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required style={inputStyle} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                {isLogin && (
                  <button type="button" onClick={() => setShowForgotPassword(true)}
                    style={{ ...switchBtn, fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <PasswordInput
                value={formData.password}
                onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (!isLogin) setShowPasswordReqs(true) }}
                placeholder="Enter your password"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}
                showRequirements={!isLogin && showPasswordReqs}
                passwordReqs={getPasswordReqs(formData.password)}
                onFocus={() => { if (!isLogin) setShowPasswordReqs(true) }}
              />
            </div>

            {!isLogin && (
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <PasswordInput
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <label style={labelStyle}>I am a...</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { role: 'student', label: 'Student' },
                    { role: 'teacher', label: 'Teacher' },
                  ].map(({ role, label }) => (
                    <motion.button key={role} type="button" whileTap={{ scale: 0.97 }}
                      onClick={() => setFormData({ ...formData, role })}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        background: formData.role === role
                          ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                          : (isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'),
                        color: formData.role === role ? 'white' : (isDark ? '#94a3b8' : '#64748b'),
                        border: `1.5px solid ${formData.role === role ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: formData.role === role ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01, boxShadow: '0 6px 20px rgba(99,102,241,0.5)' }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              style={{ ...primaryBtn(isLoading), marginTop: '4px' }}
            >
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </motion.button>

            <p style={{ textAlign: 'center', fontSize: '14px', color: isDark ? '#64748b' : '#94a3b8', margin: '4px 0 0' }}>
              {isLogin ? (
                <>Don't have an account?{' '}
                  <button type="button" style={switchBtn}
                    onClick={() => { setIsLogin(false); setValidationError(''); clearError() }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" style={switchBtn}
                    onClick={() => { setIsLogin(true); setValidationError(''); clearError() }}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </motion.div>

      {/* ── RIGHT — Illustration Panel ── */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={{
            flex: 1,
            background: illustrationBg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '100vh',
          }}
        >
          {/* Decorative blobs */}
          <div style={{
            position: 'absolute', top: '-10%', right: '-10%',
            width: '400px', height: '400px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '50%', filter: 'blur(60px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-10%', left: '-5%',
            width: '300px', height: '300px',
            background: 'rgba(139,92,246,0.2)',
            borderRadius: '50%', filter: 'blur(60px)',
          }} />

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}
          >
            {/* Floating illustration */}
            <motion.img
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              src="/login-illustration.jpg"
              alt="Students learning with technology"
              style={{
                width: '100%',
                maxWidth: '440px',
                borderRadius: '24px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
                display: 'block',
                margin: '0 auto 36px',
              }}
            />

            {/* Caption */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{ color: '#fff', fontSize: '26px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}
            >
              Learn Smarter, Together
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: '16px', maxWidth: '340px', margin: '0 auto', lineHeight: '1.6' }}
            >
              AI-powered polls &amp; live quizzes that make every classroom session unforgettable.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}
            >
              {['Real-time Sync', 'AI Questions', 'Live Analytics'].map((label) => (
                <span key={label} style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '7px 16px',
                  borderRadius: '50px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}>
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default AuthPage
