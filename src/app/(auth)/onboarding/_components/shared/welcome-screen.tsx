'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Building2, Sparkles } from 'lucide-react'
import { type OnboardingRoute } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'

export function WelcomeScreen({
  onSelectRoute,
}: {
  onSelectRoute: (route: OnboardingRoute) => void
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <motion.div variants={staggerItem} className="text-left mb-6 sm:mb-8">
        <h1
          className="text-2xl sm:text-3xl md:text-4xl text-white mb-2 sm:mb-3"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          Welcome to Crafted
        </h1>
        <p className="text-white/60 text-sm sm:text-base">
          Let&apos;s set up your brand so everything you create stays consistent.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {/* Option A - Existing Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute('existing')}
          className="group relative p-4 sm:p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'var(--surface-inset)',
            border: '1px solid color-mix(in srgb, var(--crafted-sage) 30%, transparent)',
          }}
          whileHover={{ borderColor: 'color-mix(in srgb, var(--crafted-sage) 60%, transparent)' }}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-crafted-olive/20 flex items-center justify-center mb-3 sm:mb-4">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-crafted-olive" />
          </div>
          <h2 className="text-base sm:text-lg text-white font-medium mb-1 sm:mb-1.5">
            I already have a brand
          </h2>
          <p className="text-white/50 text-xs sm:text-sm mb-3 sm:mb-4">
            Share your website or upload assets — we&apos;ll extract your brand DNA automatically.
          </p>
          <div className="flex items-center gap-2 text-crafted-olive text-xs sm:text-sm font-medium">
            <span>Get started</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.button>

        {/* Option B - Create Brand */}
        <motion.button
          variants={staggerItem}
          onClick={() => onSelectRoute('create')}
          className="group relative p-4 sm:p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'var(--surface-inset)',
            border: '1px solid color-mix(in srgb, var(--crafted-sage) 30%, transparent)',
          }}
          whileHover={{ borderColor: 'color-mix(in srgb, var(--crafted-sage) 60%, transparent)' }}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-crafted-olive/20 flex items-center justify-center mb-3 sm:mb-4">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-crafted-olive" />
          </div>
          <h2 className="text-base sm:text-lg text-white font-medium mb-1 sm:mb-1.5">
            I want to create a brand
          </h2>
          <p className="text-white/50 text-xs sm:text-sm mb-3 sm:mb-4">
            Answer a few questions and we&apos;ll generate brand directions for you to choose from.
          </p>
          <div className="flex items-center gap-2 text-crafted-olive text-xs sm:text-sm font-medium">
            <span>Start building</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-1 rounded-full bg-crafted-olive/20 text-crafted-olive text-[10px] sm:text-xs">
            ~5 min
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}
