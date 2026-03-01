'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Check, ArrowRight, RefreshCw, Shuffle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { DeliverableStyle } from './types'

interface StyleSelectionPanelProps {
  styles: DeliverableStyle[]
  onConfirmSelection?: (selectedStyles: DeliverableStyle[]) => void
  onShowMore?: (styleAxis: string) => void
  onShowDifferent?: () => void
  isLoading?: boolean
  className?: string
}

// ── Color Dots ──────────────────────────────────────────────────────────────

function ColorDots({ colors, size = 'sm' }: { colors: string[]; size?: 'sm' | 'md' }) {
  if (!colors || colors.length === 0) return null
  const displayed = colors.slice(0, 6)
  const dotSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'

  return (
    <div className="flex items-center gap-1">
      {displayed.map((color) => (
        <div
          key={color}
          className={cn(dotSize, 'rounded-full ring-1 ring-white/20')}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

// ── Hero Style Card (full-width, best match) ────────────────────────────────

function HeroStyleCard({
  style,
  isSelected,
  onClick,
}: {
  style: DeliverableStyle
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.4 },
        y: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer group w-full text-left',
          'transition-shadow duration-300',
          isSelected
            ? 'ring-2 ring-crafted-green shadow-lg shadow-crafted-green/15'
            : 'ring-1 ring-border/50 hover:ring-border/80'
        )}
      >
        {/* Image — 16:10 aspect for hero */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <motion.div
            className="w-full h-full"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={style.imageUrl}
              alt={style.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  'https://via.placeholder.com/800x500?text=Style'
              }}
            />
          </motion.div>

          {/* Gradient overlay */}
          <div
            className={cn(
              'absolute inset-0 transition-all duration-500',
              'bg-gradient-to-t from-black/70 via-black/20 to-transparent',
              'group-hover:from-black/80 group-hover:via-black/30'
            )}
          />

          {/* Best match badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{
              delay: 0.3,
              type: 'spring',
              stiffness: 400,
              damping: 20,
            }}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-crafted-green/90 backdrop-blur-sm rounded-full text-xs text-white font-medium"
          >
            <Sparkles className="w-3 h-3" />
            Best match
          </motion.div>

          {/* Selection indicator */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-3 right-3"
              >
                <div className="w-7 h-7 rounded-full bg-crafted-green flex items-center justify-center shadow-lg shadow-crafted-green/30">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12">
            <p className="text-white text-base font-semibold">{style.name}</p>
            {style.description && (
              <p className="text-white/60 text-sm mt-1 line-clamp-2 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                {style.description}
              </p>
            )}
            {style.colorSamples && style.colorSamples.length > 0 && (
              <div className="mt-2.5">
                <ColorDots colors={style.colorSamples} size="md" />
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}

// ── Panel Style Card (2-col grid, 3:2 aspect) ──────────────────────────────

function PanelStyleCard({
  style,
  index,
  isSelected,
  isBestMatch,
  isHero,
  onClick,
}: {
  style: DeliverableStyle
  index: number
  isSelected: boolean
  isBestMatch: boolean
  isHero: boolean
  onClick: () => void
}) {
  // Hero cards are rendered separately
  if (isHero) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.08 },
        y: { duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] },
      }}
      className="flex flex-col"
    >
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer group w-full text-left',
          'transition-shadow duration-300',
          isSelected
            ? 'ring-2 ring-crafted-green shadow-lg shadow-crafted-green/15'
            : 'ring-1 ring-border/50 hover:ring-border/80'
        )}
      >
        {/* Image — 3:2 aspect ratio */}
        <div className="relative aspect-[3/2] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={style.imageUrl}
            alt={style.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x267?text=Style'
            }}
          />

          {/* Gradient overlay */}
          <div
            className={cn(
              'absolute inset-0 transition-all duration-500',
              'bg-gradient-to-t from-black/65 via-black/15 to-transparent',
              'group-hover:from-black/75 group-hover:via-black/25'
            )}
          />

          {/* Best match badge */}
          <AnimatePresence>
            {isBestMatch && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{
                  delay: index * 0.08 + 0.3,
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
                className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 bg-crafted-green/90 backdrop-blur-sm rounded-full text-[10px] text-white font-medium"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Best match
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selection indicator */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-2.5 right-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-crafted-green flex items-center justify-center shadow-lg shadow-crafted-green/30">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
            <p className="text-white text-sm font-semibold">{style.name}</p>
            {style.description && (
              <p className="text-white/60 text-[11px] mt-0.5 line-clamp-2 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                {style.description}
              </p>
            )}
            {style.colorSamples && style.colorSamples.length > 0 && (
              <div className="mt-2">
                <ColorDots colors={style.colorSamples} />
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}

// ── Skeleton Cards ──────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {/* Hero skeleton */}
      <div className="rounded-2xl overflow-hidden animate-pulse">
        <div className="aspect-[16/10] bg-muted-foreground/10" />
      </div>

      {/* 2-col grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-[3/2] bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export function StyleSelectionPanel({
  styles,
  onConfirmSelection,
  onShowMore,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionPanelProps) {
  const [selectedStyle, setSelectedStyle] = useState<DeliverableStyle | null>(null)

  const handleCardClick = (style: DeliverableStyle) => {
    if (selectedStyle?.id === style.id) {
      setSelectedStyle(null)
    } else {
      setSelectedStyle(style)
    }
  }

  const handleConfirm = () => {
    if (selectedStyle && onConfirmSelection) {
      onConfirmSelection([selectedStyle])
      setSelectedStyle(null)
    }
  }

  const displayedStyles = styles

  // Find the best match style (highest brandMatchScore >= 70)
  const bestMatch =
    displayedStyles.length > 0
      ? displayedStyles.reduce<DeliverableStyle | null>((best, s) => {
          const score = s.brandMatchScore ?? 0
          if (score < 70) return best
          if (!best || score > (best.brandMatchScore ?? 0)) return s
          return best
        }, null)
      : null

  // Separate hero from grid cards
  const heroStyle = bestMatch
  const gridStyles = heroStyle
    ? displayedStyles.filter((s) => s.id !== heroStyle.id)
    : displayedStyles

  const hasStyles = displayedStyles.length > 0

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-crafted-green" />
            <span className="text-sm font-semibold text-foreground">Visual Direction</span>
          </div>
          {hasStyles && (
            <div className="flex items-center gap-1.5">
              {onShowMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowMore(displayedStyles[0].styleAxis)}
                  disabled={isLoading}
                  className="rounded-full gap-1.5 px-3.5 h-8 text-xs font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  More
                </Button>
              )}
              {onShowDifferent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowDifferent}
                  disabled={isLoading}
                  className="rounded-full gap-1.5 px-3.5 h-8 text-xs text-muted-foreground font-medium"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Shuffle
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-20">
          {!hasStyles && isLoading ? (
            <SkeletonCards />
          ) : !hasStyles ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Palette className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Preparing style options...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Hero card for best match */}
              {heroStyle && (
                <HeroStyleCard
                  style={heroStyle}
                  isSelected={selectedStyle?.id === heroStyle.id}
                  onClick={() => handleCardClick(heroStyle)}
                />
              )}

              {/* 2-column grid for remaining styles */}
              <div className="grid grid-cols-2 gap-3">
                {gridStyles.map((style, index) => (
                  <PanelStyleCard
                    key={style.id}
                    style={style}
                    index={index}
                    isSelected={selectedStyle?.id === style.id}
                    isBestMatch={false}
                    isHero={false}
                    onClick={() => handleCardClick(style)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sticky confirm bar — frosted glass */}
      <AnimatePresence>
        {selectedStyle && onConfirmSelection && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            className="shrink-0 px-4 py-3 border-t border-border/40 backdrop-blur-sm bg-background/80"
          >
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full gap-2 bg-crafted-green hover:bg-crafted-forest text-white rounded-xl h-11 font-medium shadow-sm shadow-crafted-green/15"
            >
              Continue with {selectedStyle.name}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
