'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditDeductionTickerProps {
  previousBalance: number
  newBalance: number
  creditsUsed: number
}

export function CreditDeductionTicker({
  previousBalance,
  newBalance,
  creditsUsed,
}: CreditDeductionTickerProps) {
  const [displayValue, setDisplayValue] = useState(previousBalance)
  const [showDeduction, setShowDeduction] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // Delay start so the user sees the original balance first
    const startDelay = setTimeout(() => {
      setShowDeduction(true)

      const startTime = performance.now()
      const duration = 1500 // 1.5 seconds
      const startVal = previousBalance
      const endVal = newBalance

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(startVal + (endVal - startVal) * eased)
        setDisplayValue(current)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setAnimationDone(true)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }, 800)

    return () => {
      clearTimeout(startDelay)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [previousBalance, newBalance])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-crafted-green" />
        <span
          className={cn(
            'text-2xl font-bold tabular-nums transition-colors duration-300',
            animationDone ? 'text-foreground' : 'text-crafted-green'
          )}
        >
          {displayValue}
        </span>
        <span className="text-sm text-muted-foreground">credits</span>
      </div>

      <AnimatePresence>
        {showDeduction && (
          <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
            className="text-sm font-semibold text-destructive"
          >
            -{creditsUsed}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
