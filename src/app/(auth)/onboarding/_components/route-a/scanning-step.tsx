'use client'

import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function ScanningStep({
  progress,
  scanningTexts,
}: {
  progress: number
  scanningTexts: string[]
}) {
  return (
    <GlowingCard>
      <div className="text-left">
        <motion.div
          className="w-20 h-20 rounded-full mb-8 flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--crafted-sage) 20%, transparent)' }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-10 h-10 text-crafted-olive" />
        </motion.div>

        <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
          Extracting your Brand DNA
        </h1>
        <p className="text-white/50 text-sm mb-8">This usually takes less than a minute.</p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-crafted-olive rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Animated scanning texts */}
        <div className="space-y-3">
          {scanningTexts.map((text, index) => {
            const isComplete = progress > (index + 1) * (100 / scanningTexts.length)
            const isActive = progress > index * (100 / scanningTexts.length) && !isComplete

            return (
              <motion.div
                key={text}
                className={`flex items-center gap-3 text-sm transition-all ${
                  isComplete ? 'text-crafted-olive' : isActive ? 'text-white' : 'text-white/30'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : isActive ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-current rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-current" />
                )}
                {text}
              </motion.div>
            )
          })}
        </div>
      </div>
    </GlowingCard>
  )
}
