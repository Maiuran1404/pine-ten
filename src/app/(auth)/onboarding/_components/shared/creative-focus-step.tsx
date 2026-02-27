'use client'

import { motion } from 'framer-motion'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Target,
  Layout,
  Share2,
  Presentation,
  BookOpen,
  Zap,
} from 'lucide-react'
import { type BrandData, CREATIVE_FOCUS_OPTIONS } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'
import { LoadingSpinner } from '@/components/shared/loading'

export function CreativeFocusStep({
  brandData,
  setBrandData,
  onContinue,
  onBack,
  isLoading,
}: {
  brandData: BrandData
  setBrandData: (data: BrandData) => void
  onContinue: () => void
  onBack: () => void
  isLoading: boolean
}) {
  const toggleFocus = (id: string) => {
    const newFocus = brandData.creativeFocus.includes(id)
      ? brandData.creativeFocus.filter((f) => f !== id)
      : [...brandData.creativeFocus, id]
    setBrandData({ ...brandData, creativeFocus: newFocus })
  }

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    ads: Target,
    'landing-pages': Layout,
    social: Share2,
    'pitch-decks': Presentation,
    'brand-guidelines': BookOpen,
  }

  return (
    <GlowingCard glowColor="var(--crafted-olive)" className="w-full max-w-2xl">
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1
            className="text-2xl sm:text-3xl text-white mb-3"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            What do you want to improve first?
          </h1>
          <p className="text-white/50 text-sm">
            Pick what matters right now. You can always add more later.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {CREATIVE_FOCUS_OPTIONS.map((option) => {
            const isSelected = brandData.creativeFocus.includes(option.id)
            const Icon = iconMap[option.id] || Zap

            return (
              <motion.button
                key={option.id}
                variants={staggerItem}
                onClick={() => toggleFocus(option.id)}
                className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 min-h-[72px] ${
                  isSelected ? 'bg-crafted-olive/20 border-crafted-olive/50' : 'hover:bg-white/5'
                }`}
                style={{
                  border: isSelected
                    ? '1px solid color-mix(in srgb, var(--crafted-olive) 50%, transparent)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-crafted-olive text-black' : 'bg-white/10 text-white/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm leading-tight">{option.title}</h3>
                  <p className="text-white/40 text-xs mt-0.5 leading-tight">{option.description}</p>
                </div>
                {isSelected && <Check className="w-5 h-5 text-crafted-olive shrink-0" />}
              </motion.button>
            )
          })}
        </div>

        <motion.p variants={staggerItem} className="text-white/30 text-xs text-left mb-6">
          Most teams start with 1–3.
        </motion.p>

        <motion.div variants={staggerItem} className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-4 rounded-xl font-medium text-sm border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="flex-1 py-4 rounded-xl font-medium text-sm"
            style={{ background: 'var(--button-cream)', color: 'var(--button-cream-foreground)' }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Saving...
              </span>
            ) : (
              <>
                Submit
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </GlowingCard>
  )
}
