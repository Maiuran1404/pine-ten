'use client'

import { motion } from 'framer-motion'
import { Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { type BrandData, type BrandDirection, FONT_OPTIONS } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function AIDirectionsStep({
  brandData: _brandData,
  directions,
  selectedDirection,
  onSelectDirection,
  onContinue,
  onBack,
  isGenerating,
}: {
  brandData: BrandData
  directions: BrandDirection[]
  selectedDirection: BrandDirection | null
  onSelectDirection: (direction: BrandDirection) => void
  onContinue: () => void
  onBack: () => void
  isGenerating: boolean
}) {
  if (isGenerating) {
    return (
      <GlowingCard>
        <div className="text-left">
          <motion.div
            className="w-16 h-16 rounded-full mb-6 flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--crafted-olive) 20%, transparent)' }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-crafted-olive" />
          </motion.div>

          <h1
            className="text-2xl text-white mb-2"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Creating your brand directions
          </h1>
          <p className="text-white/50 text-sm">
            Building personalized options based on your preferences...
          </p>
        </div>
      </GlowingCard>
    )
  }

  return (
    <GlowingCard>
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-6">
          <h1
            className="text-2xl sm:text-3xl text-white mb-2"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Choose a direction
          </h1>
          <p className="text-white/50 text-sm">
            Pick the one that feels right. You can always refine it later.
          </p>
        </motion.div>

        <div className="space-y-6 mb-8">
          {directions.map((direction) => {
            const isSelected = selectedDirection?.id === direction.id
            const getFontFamilyCSS = (fontName: string) => {
              const font = FONT_OPTIONS.find((f) => f.value === fontName)
              return font?.family || `'${fontName}', sans-serif`
            }
            return (
              <motion.button
                key={direction.id}
                variants={staggerItem}
                onClick={() => onSelectDirection(direction)}
                className={`w-full rounded-2xl text-left transition-all overflow-hidden ${
                  isSelected ? 'ring-2 ring-crafted-olive' : 'hover:ring-1 hover:ring-white/20'
                }`}
                style={{
                  background: 'var(--surface-overlay)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Header with name and check */}
                <div className="p-5 pb-4 flex items-center justify-between border-b border-white/5">
                  <div>
                    <p className="text-white/30 text-xs mb-1">Direction</p>
                    <h3 className="text-white text-lg font-medium">{direction.name}</h3>
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-crafted-olive/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-crafted-olive" />
                    </div>
                  )}
                </div>

                {/* Color Palette Section */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">
                    Color Palette
                  </p>
                  <div className="flex justify-between gap-2">
                    {direction.colorPalette.slice(0, 5).map((color, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div
                          className="w-full aspect-square rounded-full mb-2 mx-auto max-w-[48px]"
                          style={{
                            backgroundColor: color,
                            boxShadow:
                              color === '#ffffff' ||
                              color === '#fafaf9' ||
                              color === '#f5f5f5' ||
                              color === '#f5f5f4'
                                ? 'inset 0 0 0 1px rgba(0,0,0,0.08)'
                                : undefined,
                          }}
                        />
                        <p className="text-white/60 text-[10px] leading-tight mb-0.5 truncate">
                          {direction.colorNames?.[i] || 'Color'}
                        </p>
                        <p className="text-white/30 text-[9px] font-mono">
                          {color.replace('#', '').toLowerCase()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Typography Section */}
                <div className="p-5 border-b border-white/5">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-4">
                    Typography
                  </p>
                  <div className="flex gap-8">
                    {/* Primary Font */}
                    <div className="flex-1">
                      <div
                        className="text-4xl text-white/90 mb-1"
                        style={{
                          fontFamily: getFontFamilyCSS(direction.primaryFont),
                        }}
                      >
                        Aa
                      </div>
                      <p className="text-white/50 text-xs">{direction.primaryFont}</p>
                    </div>
                    {/* Secondary Font */}
                    <div className="flex-1">
                      <div
                        className="text-4xl text-white/90 mb-1"
                        style={{
                          fontFamily: getFontFamilyCSS(direction.secondaryFont),
                        }}
                      >
                        Aa
                      </div>
                      <p className="text-white/50 text-xs">{direction.secondaryFont}</p>
                    </div>
                  </div>
                </div>

                {/* Description & Keywords */}
                <div className="p-5">
                  <p className="text-white/50 text-sm mb-4">{direction.narrative}</p>
                  <div className="flex flex-wrap gap-2">
                    {direction.moodKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-3 py-1 rounded-full text-xs text-white/50 border border-white/10"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.button>
            )
          })}
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
            disabled={!selectedDirection}
            className="flex-1 py-3 rounded-xl font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
