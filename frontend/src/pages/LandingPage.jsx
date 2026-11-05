import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import LiveDemoPlayground from '../components/landing/LiveDemoPlayground'
import BentoFeatures from '../components/landing/BentoFeatures'
import RoleComparison from '../components/landing/RoleComparison'
import StatsAndTestimonials from '../components/landing/StatsAndTestimonials'
import Footer from '../components/landing/Footer'
import useAuthStore from '../stores/authStore'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  const handleOpenAuth = (isLoginMode) => {
    navigate('/login', { state: { initialLoginMode: isLoginMode } })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative selection:bg-blue-500 selection:text-white">
      {/* Dynamic Animated Navbar */}
      <Navbar onOpenAuth={handleOpenAuth} />

      {/* Main Content Sections */}
      <main>
        <HeroSection onOpenAuth={handleOpenAuth} />
        <LiveDemoPlayground />
        <BentoFeatures />
        <RoleComparison onOpenAuth={handleOpenAuth} />
        <StatsAndTestimonials />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
