import React from 'react'

const CogniPulseIcon = ({ size = 24, color = 'white', style = {} }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ 
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style 
    }}
  >
    <defs>
      <linearGradient id="pulse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8be9fd" />
        <stop offset="50%" stopColor="#50fa7b" />
        <stop offset="100%" stopColor="#ff79c6" />
      </linearGradient>
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {/* Inner decorative background element if not plain white */}
    <circle cx="50" cy="50" r="42" fill={color === 'white' ? 'url(#bg-grad)' : color} opacity="0.15" />

    {/* The Pulsing Signal Track */}
    <path 
      d="M15 50 H32 L40 28 L48 72 L55 42 L60 58 L65 50 H85" 
      stroke={color} 
      strokeWidth="7" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      filter="url(#glow)"
    />
    
    {/* Pulsing signal glow nodes / cognitive dots */}
    <circle cx="40" cy="28" r="5" fill="#60a5fa" />
    <circle cx="48" cy="72" r="5" fill="#f43f5e" />
    <circle cx="65" cy="50" r="4" fill="#34d399" />
  </svg>
)

export default CogniPulseIcon
