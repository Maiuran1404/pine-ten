'use client'

import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'
import { LoadingSpinner } from '@/components/shared/loading'

export function BrandInputStep({
  websiteUrl,
  setWebsiteUrl,
  onContinue,
  isLoading,
}: {
  websiteUrl: string
  setWebsiteUrl: (url: string) => void
  onContinue: () => void
  isLoading: boolean
}) {
  return (
    <GlowingCard>
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1
            className="text-2xl sm:text-3xl text-white mb-3"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Show us your brand
          </h1>
          <p className="text-white/50 text-sm">
            Give us one thing — we&apos;ll take care of the rest.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Website URL Input */}
          <motion.div variants={staggerItem} className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Paste your website URL</label>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Globe className="w-5 h-5 text-white/30" />
              </div>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full bg-transparent py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none"
                placeholder="yourcompany.com"
                onKeyDown={(e) => e.key === 'Enter' && websiteUrl.trim() && onContinue()}
              />
            </div>
          </motion.div>

          {/* Continue Button */}
          <motion.button
            variants={staggerItem}
            onClick={onContinue}
            disabled={!websiteUrl.trim()}
            className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: websiteUrl.trim()
                ? 'var(--button-cream)'
                : 'color-mix(in srgb, var(--button-cream) 30%, transparent)',
              color: 'var(--button-cream-foreground)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                Analyzing...
              </span>
            ) : (
              'Continue'
            )}
          </motion.button>
        </div>
      </motion.div>
    </GlowingCard>
  )
}
