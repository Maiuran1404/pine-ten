'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { type BrandData, BRAND_TONE_OPTIONS } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { BRAND_SIGNAL_SLIDERS } from '@/app/(auth)/onboarding/_constants/sliders'
import { BRAND_ARCHETYPES } from '@/app/(auth)/onboarding/_constants/archetypes'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'
import { BrandSignalSlider } from '@/app/(auth)/onboarding/_components/shared/brand-signal-slider'
import {
  hexToRgb,
  generateFallbackVoiceSummary,
  getBrandArchetype,
} from '@/app/(auth)/onboarding/_utils/brand-utils'

export function FineTuneStep({
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
  // Use brand primary color or fallback to default
  const accentColor = brandData.primaryColor || 'var(--crafted-olive)'

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

  // Initialize signal values if not present (4 signals)
  const getSignalValue = (id: string): number => {
    const numLevels = getNumLevels(id)
    const value = brandData[id as keyof BrandData]
    if (typeof value === 'number') {
      return snapToStep(value, numLevels)
    }
    // Map from old values if available, then snap
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

  // Compute derived values for archetype card
  const signals = {
    tone: getSignalValue('signalTone'),
    density: getSignalValue('signalDensity'),
    warmth: getSignalValue('signalWarmth'),
    energy: getSignalValue('signalEnergy'),
  }
  const archetypeKey = getBrandArchetype(signals)
  const archetype = BRAND_ARCHETYPES[archetypeKey] || {
    name: 'Versatile Classic',
    brands: ['Google', 'Microsoft', 'Adobe'],
  }
  const brandToneOption = BRAND_TONE_OPTIONS.find((o) => o.value === brandData.brandTone)
  const brandToneLabel = brandToneOption?.label || 'Professional & Trustworthy'
  const voiceSummary =
    brandData.brandVoiceSummary || generateFallbackVoiceSummary(brandData, signals)

  // Compute rgba background from brand primary color
  const rgb = hexToRgb(accentColor)
  const cardBg = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`
    : 'color-mix(in srgb, var(--crafted-olive) 6%, transparent)'
  const cardBorder = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
    : 'color-mix(in srgb, var(--crafted-olive) 15%, transparent)'

  return (
    <GlowingCard glowColor="var(--crafted-olive)" className="max-w-lg">
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        {/* Heading + AI voice summary */}
        <motion.div variants={staggerItem} className="text-left mb-3">
          <h1
            className="text-2xl sm:text-3xl text-white mb-2"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Your brand voice
          </h1>
          <p className="text-white/60 text-sm leading-relaxed line-clamp-3">{voiceSummary}</p>
        </motion.div>

        {/* Archetype assessment card */}
        <motion.div
          variants={staggerItem}
          className="rounded-xl p-3 mb-2"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white text-lg" style={{ fontFamily: "'Times New Roman', serif" }}>
              {archetype.name}
            </span>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full text-crafted-olive"
              style={{
                background: 'color-mix(in srgb, var(--crafted-olive) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--crafted-olive) 30%, transparent)',
              }}
            >
              {brandToneLabel}
            </span>
          </div>
          <p className="text-white/40 text-xs mt-1.5">Similar to {archetype.brands.join(', ')}</p>
        </motion.div>

        {/* Fine-tune label */}
        <motion.div variants={staggerItem} className="mb-2">
          <span className="text-white/30 text-[11px] uppercase tracking-wider font-medium">
            Fine-tune if needed
          </span>
        </motion.div>

        <div className="space-y-2 mb-3">
          {BRAND_SIGNAL_SLIDERS.map((slider) => (
            <motion.div key={slider.id} variants={staggerItem}>
              <BrandSignalSlider
                slider={slider}
                value={getSignalValue(slider.id)}
                onChange={(value) => setBrandData({ ...brandData, [slider.id]: value })}
                accentColor={accentColor}
              />
            </motion.div>
          ))}
        </div>

        <motion.div variants={staggerItem} className="flex gap-3">
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
            Save & continue
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  )
}
