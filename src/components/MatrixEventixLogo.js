import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function MatrixEventixLogo({ width = 300, height = 300 }) {
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    const newStreams = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: (i * 20) - 140,
      delay: Math.random() * 3
    }));
    setStreams(newStreams);
  }, []);

  return (
    <div style={{ position: 'relative', width, height, background: '#000', borderRadius: '16px', overflow: 'hidden' }}>
      {streams.map((stream) => (
        <motion.div
          key={stream.id}
          style={{
            position: 'absolute',
            width: '2px',
            left: `calc(50% + ${stream.x}px)`,
            background: 'linear-gradient(180deg, transparent, #00d4ff, transparent)',
            height: '100px',
          }}
          animate={{
            y: [-100, height + 100],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: stream.delay,
            ease: 'linear'
          }}
        />
      ))}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.svg
          width={180}
          height={180}
          viewBox="0 0 220 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="matrixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#0099ff" />
            </linearGradient>
            <filter id="matrixGlow">
              <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g transform="translate(60, 50)" filter="url(#matrixGlow)">
            <circle cx="15" cy="15" r="15" fill="url(#matrixGrad)" opacity="0.9" />
            <circle cx="40" cy="15" r="15" fill="url(#matrixGrad)" opacity="0.85" />
            <circle cx="65" cy="15" r="15" fill="url(#matrixGrad)" opacity="0.9" />
            <circle cx="15" cy="40" r="15" fill="url(#matrixGrad)" opacity="0.85" />
            <circle cx="15" cy="60" r="15" fill="url(#matrixGrad)" opacity="0.9" />
            <circle cx="40" cy="60" r="15" fill="url(#matrixGrad)" opacity="0.85" />
            <circle cx="60" cy="60" r="15" fill="url(#matrixGrad)" opacity="0.8" />
            <circle cx="15" cy="85" r="15" fill="url(#matrixGrad)" opacity="0.85" />
            <circle cx="15" cy="105" r="15" fill="url(#matrixGrad)" opacity="0.9" />
            <circle cx="40" cy="105" r="15" fill="url(#matrixGrad)" opacity="0.85" />
            <circle cx="65" cy="105" r="15" fill="url(#matrixGrad)" opacity="0.9" />
          </g>
        </motion.svg>
      </div>
    </div>
  );
}
