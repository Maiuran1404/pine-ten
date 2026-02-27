'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { type BrandData } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function _ToneOfVoiceStep({
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
  const examples = [
    "We're fast and technical",
    "We're calm and trustworthy",
    "We're modern but serious",
    "We're bold and creative",
    "We're friendly and approachable",
  ]

  return (
    <GlowingCard>
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1
            className="text-2xl sm:text-3xl text-white mb-3"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            One last thing
          </h1>
          <p className="text-white/50 text-sm">
            What should people immediately understand when they see your brand?
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            variants={staggerItem}
            className="relative rounded-xl overflow-hidden"
            style={{
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <textarea
              value={brandData.brandPositioning || ''}
              onChange={(e) => setBrandData({ ...brandData, brandPositioning: e.target.value })}
              className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none min-h-[120px] resize-none"
              placeholder="Describe your brand in a sentence..."
            />
          </motion.div>

          <motion.div variants={staggerItem} className="space-y-2">
            <p className="text-white/40 text-xs">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setBrandData({ ...brandData, brandPositioning: example })}
                  className="px-3 py-1.5 rounded-full text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={staggerItem} className="flex gap-3 mt-8">
          <button
            onClick={onBack}
            className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-4 rounded-xl font-medium text-sm"
            style={{ background: 'var(--button-cream)', color: 'var(--button-cream-foreground)' }}
          >
            Generate Directions
            <Sparkles className="w-4 h-4 inline ml-2" />
          </button>
        </motion.div>

        <motion.button
          variants={staggerItem}
          onClick={onContinue}
          className="w-full mt-3 py-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Skip this step
        </motion.button>
      </motion.div>
    </GlowingCard>
  )
}
