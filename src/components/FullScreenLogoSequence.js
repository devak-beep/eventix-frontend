import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MatrixEventixLogo } from './MatrixEventixLogo';

export function FullScreenLogoSequence({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.3 }}
        animate={{ scale: 1.8 }}
        transition={{ duration: 8, ease: 'easeInOut' }}
      >
        <MatrixEventixLogo width={500} height={500} />
      </motion.div>
    </motion.div>
  );
}
