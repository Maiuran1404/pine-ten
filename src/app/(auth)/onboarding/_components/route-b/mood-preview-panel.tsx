'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { type BrandData } from '@/components/onboarding/types'
import { BrandReferenceGridSkeleton, ImageWithSkeleton } from '@/components/ui/skeletons'
import { BRAND_ARCHETYPES } from '@/app/(auth)/onboarding/_constants/archetypes'
import { getBrandArchetype } from '@/app/(auth)/onboarding/_utils/brand-utils'
import { type BrandReference } from '@/app/(auth)/onboarding/_types'

export function MoodPreviewPanel({ brandData }: { brandData: BrandData }) {
  const [brandReferences, setBrandReferences] = useState<BrandReference[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get slider values for all signals (4 signals now)
  const getSignalValue = (id: string): number => {
    const value = brandData[id as keyof BrandData]
    if (typeof value === 'number') return value
    // Fallback to old values
    switch (id) {
      case 'signalTone':
        return (brandData.feelPlayfulSerious as number) || 50
      case 'signalDensity':
        return (brandData.feelBoldMinimal as number) || 50
      case 'signalWarmth':
        return 50
      case 'signalEnergy':
        return 50
      default:
        return 50
    }
  }

  // Get all signal values (4 signals)
  const signals = {
    tone: getSignalValue('signalTone'),
    density: getSignalValue('signalDensity'),
    warmth: getSignalValue('signalWarmth'),
    energy: getSignalValue('signalEnergy'),
  }

  // Fetch brand references from the database based on current slider values
  // Debounced to prevent excessive API calls when adjusting sliders
  useEffect(() => {
    const fetchBrandReferences = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/brand-references/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signalTone: signals.tone,
            signalDensity: signals.density,
            signalWarmth: signals.warmth,
            signalEnergy: signals.energy,
            limit: 12,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setBrandReferences(data.data?.references || [])
        }
      } catch (error) {
        console.error('Error fetching brand references:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the fetch to avoid too many API calls while adjusting sliders
    const timeoutId = setTimeout(fetchBrandReferences, 300)
    return () => clearTimeout(timeoutId)
  }, [signals.tone, signals.density, signals.warmth, signals.energy])

  // Get the current brand archetype for displaying name/description
  const archetypeKey = getBrandArchetype(signals)
  const archetype = BRAND_ARCHETYPES[archetypeKey]

  // Use fetched brand reference images, or show loading state
  const images = brandReferences.map((ref) => ref.imageUrl)

  // If we have fewer than 4 images, duplicate them to fill 4 columns
  const displayImages =
    images.length > 0
      ? images.length >= 4
        ? images.slice(0, 4)
        : [...images, ...images, ...images, ...images].slice(0, 4)
      : []

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-3xl"
    >
      {/* Scrolling Image Columns - 4 columns showing brand reference images from database */}
      <div className="relative">
        {isLoading ? (
          <BrandReferenceGridSkeleton columns={4} />
        ) : displayImages.length === 0 ? (
          <BrandReferenceGridSkeleton columns={4} />
        ) : (
          <div className="flex gap-4 justify-center">
            {displayImages.map((imageSrc, index) => (
              <motion.div
                key={`column-${index}-${imageSrc}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="relative flex-shrink-0"
                style={{ width: '140px' }}
              >
                {/* Scrolling container */}
                <div
                  className="relative h-[420px] overflow-hidden rounded-2xl"
                  style={{
                    background: 'var(--surface-inset)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Top fade gradient */}
                  <div
                    className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)',
                    }}
                  />

                  {/* Bottom fade gradient */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(0deg, rgba(10, 10, 10, 1) 0%, rgba(10, 10, 10, 0.7) 50%, transparent 100%)',
                    }}
                  />

                  {/* Scrolling images - use all brand references for seamless scrolling */}
                  <motion.div
                    key={`scroll-${index}`}
                    className="flex flex-col gap-3 p-2"
                    animate={{
                      y:
                        index % 2 === 0
                          ? [0, -(images.length * (200 + 12))]
                          : [-(images.length * (200 + 12)), 0],
                    }}
                    transition={{
                      y: {
                        duration: 60 + index * 10,
                        repeat: Infinity,
                        ease: 'linear',
                      },
                    }}
                  >
                    {/* Repeat all brand reference images for seamless scrolling */}
                    {[...images, ...images, ...images].map((src, imgIndex) => (
                      <motion.div
                        key={`${index}-${imgIndex}-${src}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative flex-shrink-0 rounded-xl overflow-hidden shadow-lg"
                        style={{
                          width: '100%',
                          height: '200px',
                        }}
                      >
                        <ImageWithSkeleton
                          src={src}
                          alt={
                            brandReferences[imgIndex % brandReferences.length]?.name ||
                            `Brand reference ${imgIndex + 1}`
                          }
                          className="w-full h-full"
                          skeletonClassName="bg-white/5"
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Archetype Name and Similar Brands */}
      <motion.div
        key={archetypeKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 text-center"
      >
        {/* Archetype Name */}
        <h3 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
          {archetype.name}
        </h3>

        {/* Similar Brands */}
        <p className="text-white/40 text-sm">
          Similar to <span className="text-white/60">{archetype.brands.join(', ')}</span>
        </p>
      </motion.div>
    </motion.div>
  )
}
