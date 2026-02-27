'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import {
  type BrandData,
  type VisualPreference,
  VISUAL_COMPARISON_PAIRS,
} from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function VisualInstinctStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
}: {
  brandData: BrandData
  setBrandData: (data: BrandData) => void
  onContinue: () => void
  onBack: () => void
}) {
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const currentPair = VISUAL_COMPARISON_PAIRS[currentPairIndex]

  const handleChoice = (choice: 'A' | 'B') => {
    const newPreference: VisualPreference = {
      id: currentPair.id,
      choice,
      dimension: currentPair.dimension,
    }

    const existingPrefs = brandData.visualPreferences || []
    const updatedPrefs = [...existingPrefs.filter((p) => p.id !== currentPair.id), newPreference]
    setBrandData({ ...brandData, visualPreferences: updatedPrefs })

    if (currentPairIndex < VISUAL_COMPARISON_PAIRS.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1)
    } else {
      onContinue()
    }
  }

  const getVisualComponent = (visual: string) => {
    switch (visual) {
      case 'light':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-white to-muted flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-muted" />
          </div>
        )
      case 'dark':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-foreground to-black flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-muted-foreground" />
          </div>
        )
      case 'text-heavy':
        return (
          <div className="w-full h-28 rounded-xl bg-white p-4 flex flex-col justify-center gap-1.5">
            <div className="h-2.5 bg-foreground rounded w-3/4" />
            <div className="h-1.5 bg-muted-foreground rounded w-full" />
            <div className="h-1.5 bg-muted-foreground rounded w-2/3" />
            <div className="h-1.5 bg-muted-foreground rounded w-5/6" />
          </div>
        )
      case 'visual':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-crafted-olive to-crafted-olive-dark flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-white/80" />
          </div>
        )
      case 'structured':
        return (
          <div className="w-full h-28 rounded-xl bg-white p-2.5 grid grid-cols-3 gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-muted rounded" />
            ))}
          </div>
        )
      case 'expressive':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-ds-status-review via-ds-accent to-ds-warning relative overflow-hidden">
            <div className="absolute top-2 left-4 w-6 h-6 rounded-full bg-white/30 -rotate-12" />
            <div className="absolute bottom-3 right-2 w-10 h-10 rounded-full bg-white/20 rotate-45" />
          </div>
        )
      case 'calm':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-ds-info/20 to-ds-info/30 flex items-center justify-center">
            <div className="w-16 h-1 bg-ds-info/40 rounded" />
          </div>
        )
      case 'energetic':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-ds-warning to-ds-error flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-white rounded-full"
                style={{ height: `${20 + (i % 3) * 20}%` }}
              />
            ))}
          </div>
        )
      case 'minimal':
        return (
          <div className="w-full h-28 rounded-xl bg-white flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-foreground rounded-full" />
          </div>
        )
      case 'dense':
        return (
          <div className="w-full h-28 rounded-xl bg-foreground p-2 grid grid-cols-4 gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-muted-foreground to-muted-foreground/80 rounded"
              />
            ))}
          </div>
        )
      case 'geometric':
        return (
          <div className="w-full h-28 rounded-xl bg-white flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-foreground" />
            <div className="w-8 h-8 bg-foreground rotate-45" />
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[28px] border-l-transparent border-r-transparent border-b-foreground" />
          </div>
        )
      case 'organic':
        return (
          <div className="w-full h-28 rounded-xl bg-gradient-to-br from-crafted-mint/30 to-crafted-mint/50 flex items-center justify-center">
            <div className="w-14 h-10 bg-crafted-sage rounded-[50%_50%_50%_50%/60%_60%_40%_40%]" />
          </div>
        )
      default:
        return <div className="w-full h-28 rounded-xl bg-muted" />
    }
  }

  return (
    <GlowingCard>
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-6">
          <h1
            className="text-2xl sm:text-3xl text-white mb-2"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            What feels right to you?
          </h1>
          <p className="text-white/50 text-sm">Go with your gut. There are no wrong answers.</p>
        </motion.div>

        {/* Progress */}
        <motion.div variants={staggerItem} className="flex gap-1.5 mb-6">
          {VISUAL_COMPARISON_PAIRS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < currentPairIndex
                  ? 'bg-crafted-olive'
                  : i === currentPairIndex
                    ? 'bg-white/40'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPairIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <button
              onClick={() => handleChoice('A')}
              className="group p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {getVisualComponent(currentPair.optionA.visual)}
              <div className="mt-3 text-left">
                <h3 className="text-white font-medium text-sm">{currentPair.optionA.label}</h3>
                <p className="text-white/40 text-xs">{currentPair.optionA.description}</p>
              </div>
            </button>

            <button
              onClick={() => handleChoice('B')}
              className="group p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {getVisualComponent(currentPair.optionB.visual)}
              <div className="mt-3 text-left">
                <h3 className="text-white font-medium text-sm">{currentPair.optionB.label}</h3>
                <p className="text-white/40 text-xs">{currentPair.optionB.description}</p>
              </div>
            </button>
          </motion.div>
        </AnimatePresence>

        <motion.div variants={staggerItem} className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--button-cream)', color: 'var(--button-cream-foreground)' }}
          >
            Skip to directions
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  )
}
