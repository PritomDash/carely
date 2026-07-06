import React from 'react';

export default function CarelyLogo({ size = 32, white = false }) {
  const heartFill = white ? '#FFFFFF' : 'url(#carelyGrad)';
  const pulseStroke = white ? '#2563EB' : '#FFFFFF';
  return (
    <svg
      width={size}
      height={size * (122 / 136)}
      viewBox="0 0 136 122"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Carely logo"
    >
      <defs>
        <linearGradient id="carelyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <path
        d="M68 122 C 22 81, 5 52, 5 32 C 5 11, 22 0, 39 0 C 53 0, 63 9, 68 19 C 73 9, 83 0, 97 0 C 114 0, 131 11, 131 32 C 131 52, 114 81, 68 122 Z"
        fill={heartFill}
      />
      <polyline
        points="20,55 44,55 53,34 64,74 76,45 82,55 116,55"
        fill="none"
        stroke={pulseStroke}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
