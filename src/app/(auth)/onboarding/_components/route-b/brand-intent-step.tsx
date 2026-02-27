'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Building2 } from 'lucide-react'
import { type BrandData, PRODUCT_TYPES, TARGET_AUDIENCES } from '@/components/onboarding/types'
import { staggerContainer, staggerItem } from '@/app/(auth)/onboarding/_constants/animations'
import { GlowingCard } from '@/app/(auth)/onboarding/_components/shared/glowing-card'

export function BrandIntentStep({
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
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>(
    brandData.targetAudience ? brandData.targetAudience.split(', ').filter(Boolean) : []
  )

  const toggleAudience = (id: string) => {
    const newAudiences = selectedAudiences.includes(id)
      ? selectedAudiences.filter((a) => a !== id)
      : [...selectedAudiences, id]
    setSelectedAudiences(newAudiences)
    setBrandData({ ...brandData, targetAudience: newAudiences.join(', ') })
  }

  return (
    <GlowingCard>
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem} className="text-left mb-8">
          <h1
            className="text-2xl sm:text-3xl text-white mb-3"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Tell us about your brand
          </h1>
          <p className="text-white/50 text-sm">
            Give us a few details — we&apos;ll create something that fits.
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Company Name */}
          <motion.div variants={staggerItem} className="space-y-2">
            <label className="text-white/70 text-sm font-medium">
              What&apos;s your brand called?
            </label>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'var(--surface-input)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Building2 className="w-5 h-5 text-white/30" />
              </div>
              <input
                type="text"
                value={brandData.name}
                onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                className="w-full bg-transparent py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none"
                placeholder="Company or product name"
              />
            </div>
          </motion.div>

          {/* Product Type */}
          <motion.div variants={staggerItem} className="space-y-3">
            <label className="text-white/70 text-sm font-medium">What are you building?</label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setBrandData({ ...brandData, productType: type.id })}
                  className={`p-3 rounded-xl text-center transition-all duration-200 ${
                    brandData.productType === type.id ? 'bg-crafted-olive/20' : 'hover:bg-white/5'
                  }`}
                  style={{
                    border:
                      brandData.productType === type.id
                        ? '1px solid color-mix(in srgb, var(--crafted-olive) 50%, transparent)'
                        : '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    className={`text-sm font-medium ${
                      brandData.productType === type.id ? 'text-crafted-olive' : 'text-white/80'
                    }`}
                  >
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Target Audience */}
          <motion.div variants={staggerItem} className="space-y-3">
            <label className="text-white/70 text-sm font-medium">Who is this for?</label>
            <div className="flex flex-wrap gap-2">
              {TARGET_AUDIENCES.map((audience) => (
                <button
                  key={audience.id}
                  onClick={() => toggleAudience(audience.id)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                    selectedAudiences.includes(audience.id)
                      ? 'bg-crafted-olive/20 text-crafted-olive'
                      : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                  }`}
                  style={{
                    border: selectedAudiences.includes(audience.id)
                      ? '1px solid color-mix(in srgb, var(--crafted-olive) 50%, transparent)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  {audience.label}
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
            className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
