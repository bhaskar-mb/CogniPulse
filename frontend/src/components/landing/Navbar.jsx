import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import CogniPulseIcon from '../CogniPulseIcon'
import ThemeToggle from '../ThemeToggle'
import useAuthStore from '../../stores/authStore'
import { Sparkles, ArrowRight, Menu, X, Zap, BookOpen, Layers, BarChart3, Users } from 'lucide-react'

export default function Navbar({ onOpenAuth }) {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Features', href: '#features', icon: Layers },
    { name: 'Interactive Demo', href: '#demo', icon: Zap },
    { name: 'Role Experience', href: '#roles', icon: BookOpen },
    { name: 'Analytics', href: '#analytics', icon: BarChart3 },
  ]

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const elem = document.querySelector(href)
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-lg shadow-black/5'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 relative overflow-hidden"
          >
            <CogniPulseIcon />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-200 bg-clip-text text-transparent">
              CogniPulse
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">
              AI Classroom Pulse
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-100/60 dark:bg-gray-800/60 p-1.5 rounded-full backdrop-blur-md border border-gray-200/40 dark:border-gray-700/40 shadow-inner">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="relative px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white rounded-full transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(user?.role === 'teacher' ? '/teacher' : '/student')}
              className="shimmer-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onOpenAuth ? onOpenAuth(true) : navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Sign In
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onOpenAuth ? onOpenAuth(false) : navigate('/login')}
                className="shimmer-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-blue-500/25 transition-all"
              >
                <Sparkles className="w-4 h-4 text-blue-200 animate-pulse" />
                <span>Launch App</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-b border-gray-200 dark:border-gray-800 px-6 py-5 shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>{link.name}</span>
                </a>
              ))}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(user?.role === 'teacher' ? '/teacher' : '/student')
                    }}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onOpenAuth ? onOpenAuth(true) : navigate('/login')
                      }}
                      className="w-full py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onOpenAuth ? onOpenAuth(false) : navigate('/login')
                      }}
                      className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Launch App</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
