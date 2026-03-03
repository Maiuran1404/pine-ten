'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { type BrandData, FONT_OPTIONS } from '@/components/onboarding/types'

export function BrandCardPreviewPanel({ brandData }: { brandData: BrandData }) {
  const [logoErrUrl, setLogoErrUrl] = useState<string | null>(null)
  const colors = [brandData.primaryColor, brandData.secondaryColor, brandData.accentColor].filter(
    Boolean
  )
  const primaryColor = colors[0] || '#3b82f6'
  const secondaryColor = colors[1] || '#8b5cf6'
  const accentColor = colors[2] || '#f59e0b'

  const getFontFamily = (fontName: string) => {
    const font = FONT_OPTIONS.find((f) => f.value === fontName)
    return font?.family || "'Satoshi', sans-serif"
  }
  const fontFamily = getFontFamily(brandData.primaryFont || 'Satoshi')

  // Re-animate on name/font changes
  const animationKey = `${brandData.name}-${brandData.primaryFont}`

  // Derive logo error from whether current URL matches the failed URL
  const currentLogoUrl = brandData.logoUrl || brandData.faviconUrl
  const logoErr = currentLogoUrl ? currentLogoUrl === logoErrUrl : false

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-sm"
    >
      <div className="relative">
        {/* Holographic shimmer overlay */}
        <div
          className="absolute -inset-[1px] rounded-2xl opacity-30 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}40, transparent 30%, ${secondaryColor}30, transparent 60%, ${accentColor}40, transparent 80%, ${primaryColor}20)`,
            filter: 'blur(1px)',
          }}
        />

        {/* Square-ish Brand Card */}
        <motion.div
          key={animationKey}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--surface-overlay)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid var(--border-subtle)',
            boxShadow: `0 0 80px ${primaryColor}12, 0 0 40px ${secondaryColor}08, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          {/* Holographic gradient overlay inside card */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}, ${accentColor}, ${primaryColor})`,
              backgroundSize: '200% 200%',
            }}
          />

          {/* Post header - avatar + name + industry */}
          <div className="relative p-6 pb-0 flex-shrink-0">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{
                  background:
                    (brandData.logoUrl || brandData.faviconUrl) && !logoErr
                      ? '#ffffff'
                      : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
              >
                {(brandData.logoUrl || brandData.faviconUrl) && !logoErr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandData.logoUrl || brandData.faviconUrl}
                    alt=""
                    className="w-full h-full object-contain p-1.5"
                    onError={() => setLogoErrUrl(brandData.logoUrl || brandData.faviconUrl || null)}
                  />
                ) : (
                  <span className="text-white font-bold text-lg" style={{ fontFamily }}>
                    {brandData.name?.[0]?.toUpperCase() || 'B'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate" style={{ fontFamily }}>
                  {brandData.name || 'Your Brand'}
                </p>
                <p className="text-white/40 text-xs truncate">
                  {brandData.industry || 'Your industry'}
                </p>
              </div>
              <span className="text-white/20 text-[10px] ml-auto">1h</span>
            </div>

            {/* Post body — show description (prefer over tagline for richer content) */}
            <p
              className="text-white/60 text-sm leading-relaxed mb-5 line-clamp-5"
              style={{ fontFamily }}
            >
              {(brandData.description && brandData.description.length > 10
                ? brandData.description.slice(0, 200)
                : null) ||
                (brandData.tagline && brandData.tagline.length > 5 ? brandData.tagline : null) ||
                'Your brand story appears here — edit colors, fonts, and details on the left to see changes in real-time.'}
            </p>
          </div>

          {/* Brand color banner */}
          <div className="flex h-2.5">
            <div className="flex-1" style={{ backgroundColor: primaryColor }} />
            <div className="flex-1" style={{ backgroundColor: secondaryColor }} />
            <div className="flex-1" style={{ backgroundColor: accentColor }} />
          </div>

          {/* Mock engagement row */}
          <div className="relative px-6 py-4 flex items-center justify-between border-t border-white/[0.06]">
            <div className="flex items-center gap-5">
              <span className="text-white/30 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
                42
              </span>
              <span className="text-white/30 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                7
              </span>
              <span className="text-white/30 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                3
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
