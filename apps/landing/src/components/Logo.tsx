'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

interface LogoProps {
  size?: number
  className?: string
}

export default function Logo({ size = 64, className = '' }: LogoProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.8
      }}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <motion.div
        whileHover={{ rotate: 360, scale: 1.1 }}
        transition={{ duration: 0.6 }}
        style={{ width: size, height: size }}
        className="relative"
      >
        {/* Outer circle with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-purple-600 to-blue-600 rounded-full shadow-2xl shadow-purple-500/30" />
        
        {/* Inner design */}
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center overflow-hidden">
          <Image
            src="/appicon.png"
            alt="Solcial Logo"
            width={size * 0.6}
            height={size * 0.6}
            className="object-contain"
          />
        </div>

        {/* Animated ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 border-4 border-purple-400 rounded-full"
        />
      </motion.div>
    </motion.div>
  )
}
