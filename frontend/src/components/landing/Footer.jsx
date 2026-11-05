import React from 'react'
import { motion } from 'motion/react'
import CogniPulseIcon from '../CogniPulseIcon'
import { Heart, Sparkles, Mail, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800/80 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-gray-100 dark:border-gray-800">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <CogniPulseIcon />
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-gray-900 dark:text-white">
                CogniPulse
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
              Real-time AI-powered active learning & live classroom polling engine. Built for seamless pedagogical engagement and high-retention lectures.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>All Systems Operational (Socket & AI Services Online)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><a href="#features" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a></li>
              <li><a href="#demo" className="hover:text-blue-600 dark:hover:text-white transition-colors">Interactive Demo</a></li>
              <li><a href="#roles" className="hover:text-blue-600 dark:hover:text-white transition-colors">Role Experience</a></li>
              <li><a href="#analytics" className="hover:text-blue-600 dark:hover:text-white transition-colors">Analytics</a></li>
            </ul>
          </div>

          {/* Integrations */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><span className="hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer">Samagama LMS</span></li>
              <li><span className="hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer">Whisper AI Core</span></li>
              <li><span className="hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer">Socket.IO Rooms</span></li>
              <li><span className="hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer">CSV / PDF Reports</span></li>
            </ul>
          </div>

          {/* Connect */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              Get in Touch
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Have feedback, custom institutional requirements, or need assistance?
            </p>
            <div className="pt-2 space-y-2">
              <a
                href="mailto:bm7728025@gmail.com"
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                bm7728025@gmail.com
              </a>
              <a
                href="mailto:saipramodvarmap@gmail.com"
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                saipramodvarmap@gmail.com
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} CogniPulse Platform. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Motion.dev</span>
            <span>& AI Transformers</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
