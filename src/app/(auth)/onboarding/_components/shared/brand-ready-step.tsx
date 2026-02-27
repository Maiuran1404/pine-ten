'use client'

import { motion } from 'framer-motion'
import { Check, ArrowRight, Sparkles, Target, Zap } from 'lucide-react'
import { type BrandData } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function BrandReadyStep({
  brandData,
  onComplete,
}: {
  brandData: BrandData
  onComplete: () => void
}) {
  const accentColor = brandData.primaryColor || 'var(--crafted-olive)'

  return (
    <GlowingCard glowColor={accentColor}>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-left">
        <motion.div
          className="w-20 h-20 rounded-full mb-8 flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <Check className="w-10 h-10 text-black" />
        </motion.div>

        <motion.div variants={staggerItem}>
          <h1
            className="text-2xl sm:text-3xl text-white mb-3"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            You&apos;re all set
          </h1>
          <p className="text-white/50 text-sm mb-8">
            Crafted now understands your brand — and will protect it as you create.
          </p>
        </motion.div>

        <div className="space-y-4 mb-8 text-left">
          <motion.div
            variants={staggerItem}
            className="p-4 rounded-xl flex items-center gap-4"
            style={{ background: 'var(--surface-input)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}30` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Your Brand DNA</h3>
              <p className="text-white/40 text-xs">
                {brandData.name} • {brandData.industry || 'Ready to go'}
              </p>
            </div>
          </motion.div>

          {brandData.creativeFocus.length > 0 && (
            <motion.div
              variants={staggerItem}
              className="p-4 rounded-xl flex items-center gap-4"
              style={{ background: 'var(--surface-input)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}30` }}
              >
                <Target className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Focus Areas</h3>
                <p className="text-white/40 text-xs">
                  {brandData.creativeFocus.length} area
                  {brandData.creativeFocus.length > 1 ? 's' : ''} selected
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            variants={staggerItem}
            className="p-4 rounded-xl flex items-center gap-4"
            style={{ background: 'var(--surface-input)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}30` }}
            >
              <Zap className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm">Available Credits</h3>
              <p className="text-white/40 text-xs">Ready to create your first asset</p>
            </div>
          </motion.div>
        </div>

        <motion.button
          variants={staggerItem}
          onClick={onComplete}
          className="w-full py-4 rounded-xl font-medium text-sm"
          style={{ background: 'var(--button-cream)', color: 'var(--button-cream-foreground)' }}
        >
          Create your first asset
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </motion.button>
      </motion.div>
    </GlowingCard>
  )
}
