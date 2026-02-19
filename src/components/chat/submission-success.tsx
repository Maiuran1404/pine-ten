'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Plus } from 'lucide-react'

interface SubmissionSuccessProps {
  taskId: string
  assignedArtist?: string | null
  onViewProject: () => void
}

/** Animated SVG checkmark */
function AnimatedCheckmark() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto">
      {/* Circle */}
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="#10b981"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Checkmark */}
      <motion.path
        d="M24 42 L34 52 L56 30"
        stroke="#10b981"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}

/** Particle dots that expand outward */
function Particles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2
        // Use deterministic offsets based on index instead of Math.random()
        const distanceOffset = ((i * 7 + 3) % 10) * 3 // 0-27 range
        const sizeOffset = ((i * 11 + 5) % 10) * 0.4 // 0-3.6 range
        const delayOffset = ((i * 13 + 2) % 10) * 0.03 // 0-0.27 range
        const distance = 60 + distanceOffset
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        const size = 3 + sizeOffset
        const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669']
        const color = colors[i % colors.length]

        return { x, y, size, color, delay: 0.3 + delayOffset }
      }),
    []
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
          }}
          transition={{
            duration: 0.8,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

export function SubmissionSuccess({
  taskId: _taskId,
  assignedArtist,
  onViewProject,
}: SubmissionSuccessProps) {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
    >
      <div className="relative flex flex-col items-center text-center px-6 max-w-md">
        {/* Particles behind checkmark */}
        <Particles />

        {/* Animated checkmark */}
        <div className="relative mb-6">
          <AnimatedCheckmark />
        </div>

        {/* Text content with staggered entrance */}
        {showContent && (
          <>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0 }}
              className="text-2xl font-bold text-foreground mb-2"
            >
              Your brief has been submitted
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-sm text-muted-foreground mb-8"
            >
              {assignedArtist
                ? `${assignedArtist} has been assigned to work on your project.`
                : "We're finding the perfect artist for your project."}{' '}
              You&apos;ll receive updates as your design progresses.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                size="lg"
                onClick={onViewProject}
                className="gap-2 rounded-xl px-8 font-semibold h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                View Your Project
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="gap-2 rounded-xl px-8 font-semibold h-12"
              >
                <Plus className="h-4 w-4" />
                Start Another Project
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
