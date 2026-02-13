import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function ExplodingEventixLogo({ width = 220, height = 220 }) {
  const [isExploded, setIsExploded] = useState(false);

  const circles = [
    { cx: 15, cy: 15, r: 15, explodeX: -60, explodeY: -60 },
    { cx: 40, cy: 15, r: 15, explodeX: 0, explodeY: -80 },
    { cx: 65, cy: 15, r: 15, explodeX: 60, explodeY: -60 },
    { cx: 15, cy: 40, r: 15, explodeX: -80, explodeY: -20 },
    { cx: 15, cy: 60, r: 15, explodeX: -90, explodeY: 0 },
    { cx: 40, cy: 60, r: 15, explodeX: 0, explodeY: 0 },
    { cx: 60, cy: 60, r: 15, explodeX: 70, explodeY: 0 },
    { cx: 15, cy: 85, r: 15, explodeX: -80, explodeY: 30 },
    { cx: 15, cy: 105, r: 15, explodeX: -60, explodeY: 60 },
    { cx: 40, cy: 105, r: 15, explodeX: 0, explodeY: 80 },
    { cx: 65, cy: 105, r: 15, explodeX: 60, explodeY: 60 },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setIsExploded(true), 100);
    const timer2 = setTimeout(() => setIsExploded(false), 1600);
    const interval = setInterval(() => {
      setIsExploded(true);
      setTimeout(() => setIsExploded(false), 1500);
    }, 3000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(interval);
    };
  }, []);

  return (
    <svg width={width} height={height} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="explodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#0099ff" />
        </linearGradient>
        <filter id="explodeGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g transform="translate(60, 50)">
        {circles.map((circle, index) => (
          <motion.circle
            key={index}
            cx={circle.cx}
            cy={circle.cy}
            r={circle.r}
            fill="url(#explodeGrad)"
            opacity={0.9}
            filter="url(#explodeGlow)"
            animate={{
              x: isExploded ? circle.explodeX : 0,
              y: isExploded ? circle.explodeY : 0,
              scale: isExploded ? 1.2 : 1,
              rotate: isExploded ? 360 : 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </g>
    </svg>
  );
}
