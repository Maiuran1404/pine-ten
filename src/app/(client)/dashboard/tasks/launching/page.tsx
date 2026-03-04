'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, Plus, Clock, Tag, Coins, AlertCircle, RotateCcw } from 'lucide-react'
import { CreditDeductionTicker } from '@/components/task-launch/credit-deduction-ticker'
import { WhatsNextTimeline } from '@/components/task-launch/whats-next-timeline'

interface PendingSubmission {
  title: string
  description: string
  category: string
  creditsRequired: number
  estimatedHours: number
  deliveryDays: number
}

/** Animated SVG checkmark for celebration zone */
function LaunchCheckmark() {
  return (
    <svg width="72" height="72" viewBox="0 0 80 80" fill="none" className="mx-auto">
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="var(--ds-success)"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d="M24 42 L34 52 L56 30"
        stroke="var(--ds-success)"
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

/** Celebration particles that burst outward */
function LaunchParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const distanceOffset = ((i * 7 + 3) % 10) * 3
        const sizeOffset = ((i * 11 + 5) % 10) * 0.4
        const delayOffset = ((i * 13 + 2) % 10) * 0.03
        const distance = 55 + distanceOffset
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        const size = 3 + sizeOffset
        const colors = [
          'var(--ds-success)',
          'var(--crafted-green-light)',
          'var(--crafted-sage)',
          'var(--crafted-mint)',
          'var(--crafted-forest)',
        ]
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

/** Read submission from sessionStorage (lazy initializer — runs once, no effect needed) */
function readSubmission(): PendingSubmission | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem('crafted-pending-submission')
    return stored ? (JSON.parse(stored) as PendingSubmission) : null
  } catch {
    return null
  }
}

function readPreviousCredits(): number | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem('crafted-previous-credits')
  return stored ? parseInt(stored, 10) : null
}

export default function LaunchingPage() {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submission] = useState<PendingSubmission | null>(readSubmission)
  const [previousCredits] = useState<number | null>(readPreviousCredits)

  // Redirect if no submission data was found in sessionStorage
  useEffect(() => {
    if (!submission) {
      router.replace('/dashboard')
    }
  }, [submission, router])

  // Show content after celebration animation — separate from init to survive strict mode remount
  useEffect(() => {
    if (!submission) return
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [submission])

  // Poll sessionStorage for API result (set by the background fire-and-forget in use-task-submission)
  useEffect(() => {
    if (taskId || error) return

    const interval = setInterval(() => {
      const storedTaskId = sessionStorage.getItem('crafted-launched-task-id')
      if (storedTaskId) {
        setTaskId(storedTaskId)
        // Clean up submission data
        sessionStorage.removeItem('crafted-pending-submission')
        clearInterval(interval)
        return
      }

      const storedError = sessionStorage.getItem('crafted-launch-error')
      if (storedError) {
        setError(storedError)
        sessionStorage.removeItem('crafted-launch-error')
        clearInterval(interval)
      }
    }, 300)

    // Stop polling after 30s as a safety net
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (!taskId && !error) {
        setError('Task creation is taking longer than expected. Please check your tasks list.')
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [taskId, error])

  // Redirect if no submission data
  if (!submission) {
    return null
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-lg">
          {/* Celebration zone */}
          <div className="relative mb-6 flex justify-center">
            <LaunchParticles />
            <LaunchCheckmark />
          </div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-6 text-center"
          >
            <h1 className="text-2xl font-bold text-foreground">Your Project Is Live</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything is set — your creative brief has been submitted
            </p>
          </motion.div>

          {showContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Credit feedback */}
              {previousCredits !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex justify-center"
                >
                  <CreditDeductionTicker
                    previousBalance={previousCredits}
                    newBalance={previousCredits - submission.creditsRequired}
                    creditsUsed={submission.creditsRequired}
                  />
                </motion.div>
              )}

              {/* Project receipt card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <h3 className="mb-3 truncate text-sm font-semibold text-foreground">
                  {submission.title}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {submission.category && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{submission.category}</span>
                    </div>
                  )}
                  {submission.estimatedHours && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{submission.estimatedHours}h estimated</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Coins className="h-3.5 w-3.5" />
                    <span>{submission.creditsRequired} credits used</span>
                  </div>
                </div>
              </motion.div>

              {/* What's next timeline */}
              <WhatsNextTimeline hasDesigner={false} estimatedHours={submission.estimatedHours} />

              {/* Error state */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                >
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-destructive">Something went wrong</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5"
                      onClick={() => router.push('/dashboard/tasks')}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      View Tasks
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.1 }}
                className="flex flex-col gap-3 pt-2 sm:flex-row"
              >
                <Button
                  size="lg"
                  onClick={() =>
                    taskId
                      ? router.push(`/dashboard/tasks/${taskId}`)
                      : router.push('/dashboard/tasks')
                  }
                  disabled={!taskId && !error}
                  className="flex-1 gap-2 rounded-xl font-semibold bg-crafted-green hover:bg-crafted-forest text-white shadow-lg shadow-crafted-green/20 disabled:opacity-50"
                >
                  {!taskId && !error ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Setting Up Project...
                    </>
                  ) : (
                    <>
                      Track Your Project
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 gap-2 rounded-xl font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Start Another Project
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
