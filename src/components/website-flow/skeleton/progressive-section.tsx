'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { GlobalStyles } from './high-fidelity-section'

interface ProgressiveSectionProps {
  section: {
    id: string
    type: string
    fidelity: 'low' | 'mid' | 'high'
  }
  globalStyles?: GlobalStyles
  /** The low-fidelity renderer (kept in section-block.tsx) */
  lowFidelityRenderer: React.ReactNode
  /** The mid-fidelity renderer */
  midFidelityRenderer: React.ReactNode
  /** The high-fidelity renderer */
  highFidelityRenderer: React.ReactNode
}

const crossfadeVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}

const crossfadeTransition = {
  duration: 0.35,
  ease: [0.4, 0, 0.2, 1] as const,
}

export function ProgressiveSection({
  section,
  lowFidelityRenderer,
  midFidelityRenderer,
  highFidelityRenderer,
}: ProgressiveSectionProps) {
  const renderer = (() => {
    switch (section.fidelity) {
      case 'high':
        return highFidelityRenderer
      case 'mid':
        return midFidelityRenderer
      case 'low':
      default:
        return lowFidelityRenderer
    }
  })()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${section.id}-${section.fidelity}`}
        variants={crossfadeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={crossfadeTransition}
      >
        {renderer}
      </motion.div>
    </AnimatePresence>
  )
}
