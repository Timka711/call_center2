import React from 'react';

interface CallCenterLoaderProps {
  className?: string;
}

export function CallCenterLoader({ className = '' }: CallCenterLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        {/* Main SVG Animation */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="animate-spin"
          style={{ animationDuration: '2s' }}
        >
          {/* Outer ring */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#gradient1)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="157"
            strokeDashoffset="39.25"
            className="animate-pulse"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 60 60;360 60 60"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Middle ring */}
          <circle
            cx="60"
            cy="60"
            r="35"
            fill="none"
            stroke="url(#gradient2)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="110"
            strokeDashoffset="27.5"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="360 60 60;0 60 60"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Inner ring */}
          <circle
            cx="60"
            cy="60"
            r="20"
            fill="none"
            stroke="url(#gradient3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="63"
            strokeDashoffset="15.75"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 60 60;360 60 60"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Center icon - Headset */}
          <g transform="translate(60, 60)">
            <g transform="scale(0.8)">
              {/* Headset arc */}
              <path
                d="M -15 -10 Q 0 -20 15 -10"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                strokeLinecap="round"
              />
              
              {/* Left earpiece */}
              <rect
                x="-18"
                y="-12"
                width="6"
                height="8"
                rx="3"
                fill="#4f46e5"
              />
              
              {/* Right earpiece */}
              <rect
                x="12"
                y="-12"
                width="6"
                height="8"
                rx="3"
                fill="#4f46e5"
              />
              
              {/* Microphone arm */}
              <path
                d="M -15 -8 Q -20 0 -18 8"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
              />
              
              {/* Microphone */}
              <circle
                cx="-18"
                cy="8"
                r="3"
                fill="#4f46e5"
              />
              
              {/* Sound waves */}
              <g opacity="0.6">
                <path
                  d="M -25 5 Q -30 8 -25 11"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M -28 3 Q -35 8 -28 13"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <animate
                    attributeName="opacity"
                    values="0.2;0.8;0.2"
                    dur="1.5s"
                    begin="0.3s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            </g>
          </g>
          
          {/* Gradients */}
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
        
        {/* Pulsing dots around the loader */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-2 h-2 bg-indigo-500 rounded-full animate-ping" 
               style={{ 
                 top: '10px', 
                 left: '50%', 
                 transform: 'translateX(-50%)',
                 animationDelay: '0s'
               }} />
          <div className="absolute w-2 h-2 bg-blue-500 rounded-full animate-ping" 
               style={{ 
                 top: '50%', 
                 right: '10px', 
                 transform: 'translateY(-50%)',
                 animationDelay: '0.5s'
               }} />
          <div className="absolute w-2 h-2 bg-purple-500 rounded-full animate-ping" 
               style={{ 
                 bottom: '10px', 
                 left: '50%', 
                 transform: 'translateX(-50%)',
                 animationDelay: '1s'
               }} />
          <div className="absolute w-2 h-2 bg-pink-500 rounded-full animate-ping" 
               style={{ 
                 top: '50%', 
                 left: '10px', 
                 transform: 'translateY(-50%)',
                 animationDelay: '1.5s'
               }} />
        </div>
      </div>
      
      {/* Call Center Text */}
      <div className="mt-6 text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
          Call Center
        </h2>
        <div className="flex items-center justify-center mt-2 space-x-1">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <p className="text-sm text-gray-600 mt-2 animate-pulse">
          Загрузка системы...
        </p>
      </div>
    </div>
  );
}