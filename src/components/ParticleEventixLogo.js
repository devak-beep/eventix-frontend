import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function ParticleEventixLogo({ width = 220, height = 220 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      delay: Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div style={{ position: 'relative', width, height }}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
            left: '50%',
            top: '50%',
          }}
          animate={{
            x: [0, particle.x, 0],
            y: [0, particle.y, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut'
          }}
        />
      ))}

      <motion.svg
        width={width}
        height={height}
        viewBox="0 0 220 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      >
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#0099ff" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(60, 50)" filter="url(#glow)">
          <circle cx="15" cy="15" r="15" fill="url(#gradient1)" opacity="0.9" />
          <circle cx="40" cy="15" r="15" fill="url(#gradient1)" opacity="0.85" />
          <circle cx="65" cy="15" r="15" fill="url(#gradient1)" opacity="0.9" />
          <circle cx="15" cy="40" r="15" fill="url(#gradient1)" opacity="0.85" />
          <circle cx="15" cy="60" r="15" fill="url(#gradient1)" opacity="0.9" />
          <circle cx="40" cy="60" r="15" fill="url(#gradient1)" opacity="0.85" />
          <circle cx="60" cy="60" r="15" fill="url(#gradient1)" opacity="0.8" />
          <circle cx="15" cy="85" r="15" fill="url(#gradient1)" opacity="0.85" />
          <circle cx="15" cy="105" r="15" fill="url(#gradient1)" opacity="0.9" />
          <circle cx="40" cy="105" r="15" fill="url(#gradient1)" opacity="0.85" />
          <circle cx="65" cy="105" r="15" fill="url(#gradient1)" opacity="0.9" />
        </g>
      </motion.svg>
    </div>
  );
}
