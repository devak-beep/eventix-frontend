import React from 'react';

export function EventixLogo({ width = 220, height = 220, className = "" }) {
  const circles = [
    { cx: 15, cy: 15, r: 15, fill: "url(#circle1)", opacity: 0.9, delay: 0 },
    { cx: 40, cy: 15, r: 15, fill: "url(#circle2)", opacity: 0.85, delay: 0.1 },
    { cx: 65, cy: 15, r: 15, fill: "url(#circle3)", opacity: 0.9, delay: 0.2 },
    { cx: 15, cy: 40, r: 15, fill: "url(#circle1)", opacity: 0.85, delay: 0.3 },
    { cx: 15, cy: 60, r: 15, fill: "url(#circle2)", opacity: 0.9, delay: 0.4 },
    { cx: 40, cy: 60, r: 15, fill: "url(#circle2)", opacity: 0.85, delay: 0.5 },
    { cx: 60, cy: 60, r: 15, fill: "url(#circle3)", opacity: 0.8, delay: 0.6 },
    { cx: 15, cy: 85, r: 15, fill: "url(#circle2)", opacity: 0.85, delay: 0.7 },
    { cx: 15, cy: 105, r: 15, fill: "url(#circle1)", opacity: 0.9, delay: 0.8 },
    { cx: 40, cy: 105, r: 15, fill: "url(#circle2)", opacity: 0.85, delay: 0.9 },
    { cx: 65, cy: 105, r: 15, fill: "url(#circle3)", opacity: 0.9, delay: 1.0 },
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.3))' }}
    >
      <defs>
        <linearGradient
          id="eventixGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#00b8ff" />
          <stop offset="100%" stopColor="#0099ff" />
        </linearGradient>
        
        <radialGradient id="circle1" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#33ddff" />
          <stop offset="100%" stopColor="#00d4ff" />
        </radialGradient>
        
        <radialGradient id="circle2" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#00b8ff" />
          <stop offset="100%" stopColor="#00d4ff" />
        </radialGradient>
        
        <radialGradient id="circle3" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#0099ff" />
          <stop offset="100%" stopColor="#00b8ff" />
        </radialGradient>
      </defs>

      <g transform="translate(60, 50)">
        {circles.map((circle, index) => (
          <circle
            key={index}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill={circle.fill}
            opacity={circle.opacity}
            className="logo-circle"
            style={{
              animation: `liquidPulse 2s ease-in-out infinite`,
              animationDelay: `${circle.delay}s`
            }}
          />
        ))}
      </g>
    </svg>
  );
}

export function EventixLogoSimple({ width = 120, height = 120, className = "" }) {
  const circles = [
    { cx: 20, cy: 20, r: 12, opacity: 0.9, delay: 0 },
    { cx: 50, cy: 20, r: 12, opacity: 0.75, delay: 0.1 },
    { cx: 80, cy: 20, r: 12, opacity: 0.6, delay: 0.2 },
    { cx: 20, cy: 50, r: 12, opacity: 0.9, delay: 0.3 },
    { cx: 50, cy: 50, r: 12, opacity: 0.75, delay: 0.4 },
    { cx: 20, cy: 80, r: 12, opacity: 0.9, delay: 0.5 },
    { cx: 50, cy: 80, r: 12, opacity: 0.75, delay: 0.6 },
    { cx: 80, cy: 80, r: 12, opacity: 0.6, delay: 0.7 },
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} adaptive-logo`}
    >
      <defs>
        {/* Light mode gradient - Cyan */}
        <linearGradient id="simpleGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#61dafb" />
          <stop offset="100%" stopColor="#4fc3e8" />
        </linearGradient>
        
        {/* Dark mode gradient - Blue */}
        <linearGradient id="simpleGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      
      {circles.map((circle, index) => (
        <circle
          key={index}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          className="logo-circle-adaptive"
          opacity={circle.opacity}
          style={{
            animation: `liquidPulse 2s ease-in-out infinite`,
            animationDelay: `${circle.delay}s`
          }}
        />
      ))}
    </svg>
  );
}
