'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { type BrandData } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { BRAND_SIGNAL_SLIDERS } from '@/app/(auth)/onboarding/_constants/sliders'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'
import { BrandSignalSlider } from '@/app/(auth)/onboarding/_components/shared/brand-signal-slider'

export function BrandPersonalityStep({
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
  // Get the number of levels for a slider by id
  const getNumLevels = (id: string): number => {
    const slider = BRAND_SIGNAL_SLIDERS.find((s) => s.id === id)
    return slider?.levels.length || 5
  }

  // Snap value to nearest step
  const snapToStep = (val: number, numLevels: number) => {
    const stepSize = 100 / (numLevels - 1)
    const stepIndex = Math.round(val / stepSize)
    return Math.min(Math.max(stepIndex * stepSize, 0), 100)
  }

  // Get signal value with proper snapping
  const getSignalValue = (id: string): number => {
    const numLevels = getNumLevels(id)
    const value = brandData[id as keyof BrandData]
    if (typeof value === 'number') {
      return snapToStep(value, numLevels)
    }
    // Map from old values if available
    let rawValue: number
    switch (id) {
      case 'signalTone':
        rawValue = (brandData.feelPlayfulSerious as number) || 50
        break
      case 'signalDensity':
        rawValue = (brandData.feelBoldMinimal as number) || 50
        break
      case 'signalWarmth':
        rawValue = 50
        break
      case 'signalEnergy':
        rawValue = 50
        break
      default:
        rawValue = 50
    }
    return snapToStep(rawValue, numLevels)
  }

  return (
    <GlowingCard glowColor="var(--crafted-olive)" className="max-w-lg">
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1
            className="text-2xl sm:text-3xl text-white mb-2"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            How should your brand feel?
          </h1>
          <p className="text-white/50 text-sm">
            Adjust these core signals to define your brand personality.
          </p>
        </motion.div>

        <div className="space-y-6 mb-8">
          {BRAND_SIGNAL_SLIDERS.map((slider) => (
            <motion.div key={slider.id} variants={staggerItem}>
              <BrandSignalSlider
                slider={slider}
                value={getSignalValue(slider.id)}
                onChange={(value) => setBrandData({ ...brandData, [slider.id]: value })}
                accentColor="var(--crafted-olive)"
              />
            </motion.div>
          ))}
        </div>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-3.5 rounded-xl font-medium text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--button-cream)', color: 'var(--button-cream-foreground)' }}
          >
            Continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  )
}
