'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Check, ArrowRight, ArrowLeft, Sparkles, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DeliverableStyle } from './types'

interface StyleSelectionPanelProps {
  styles: DeliverableStyle[]
  confirmedStyleIds?: string[]
  onConfirmSelection?: (selectedStyles: DeliverableStyle[]) => void
  onShowMore?: (styleAxis: string) => void
  onShowDifferent?: () => void
  isLoading?: boolean
  className?: string
}

const PAGE_SIZE = 3
const BEST_MATCH_THRESHOLD = 70

// ── Color Dots ──────────────────────────────────────────────────────────────

function ColorDots({ colors, size = 'sm' }: { colors: string[]; size?: 'sm' | 'md' | 'lg' }) {
  if (!colors || colors.length === 0) return null
  const displayed = colors.slice(0, 5)

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <div className="flex items-center gap-1.5">
      {displayed.map((color) => (
        <div
          key={color}
          className={cn(sizeClasses[size], 'rounded-full ring-1 ring-border/30')}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

// ── Portrait Style Card ─────────────────────────────────────────────────────

function PortraitStyleCard({
  style,
  index,
  isSelected,
  isBestMatch,
  disabled,
  onClick,
}: {
  style: DeliverableStyle
  index: number
  isSelected: boolean
  isBestMatch: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.25, delay: index * 0.05 },
        y: { duration: 0.25, delay: index * 0.05 },
      }}
      className="min-w-0"
    >
      <motion.button
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative w-full overflow-hidden rounded-xl group text-left',
          'transition-all duration-300',
          disabled && 'pointer-events-none opacity-60',
          isSelected
            ? 'ring-2 ring-crafted-green shadow-md shadow-crafted-green/10'
            : isBestMatch
              ? 'ring-1 ring-crafted-green/50 hover:ring-crafted-green cursor-pointer'
              : !disabled && 'ring-1 ring-border/40 hover:ring-border/70 cursor-pointer',
          !isSelected && disabled && 'ring-1 ring-border/40'
        )}
      >
        {/* Portrait image */}
        <div className="relative aspect-[3/4] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={style.imageUrl}
            alt={style.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400?text=Style'
            }}
          />

          {/* Bottom gradient overlay for text */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Best match badge */}
          {isBestMatch && (
            <div className="absolute top-2 left-2">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-crafted-green/90 backdrop-blur-sm rounded-md text-[9px] text-white font-medium">
                <Sparkles className="w-2 h-2" />
                Best match
              </div>
            </div>
          )}

          {/* Selection check */}
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute top-2 right-2"
              >
                <div className="w-5 h-5 rounded-full bg-crafted-green flex items-center justify-center shadow-sm">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-8">
            <p className="text-xs font-semibold text-white leading-tight truncate drop-shadow-sm">
              {style.name}
            </p>
            {style.matchReason && (
              <p className="text-[10px] text-white/70 mt-0.5 line-clamp-2 leading-snug drop-shadow-sm">
                {style.matchReason}
              </p>
            )}
            {style.colorSamples && style.colorSamples.length > 0 && (
              <div className="mt-1.5">
                <ColorDots colors={style.colorSamples} size="sm" />
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
    <div className="px-5">
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-[3/4] bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Slide variants for page transitions ─────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export function StyleSelectionPanel({
  styles,
  confirmedStyleIds,
  onConfirmSelection,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionPanelProps) {
  const [selectedStyle, setSelectedStyle] = useState<DeliverableStyle | null>(null)
  const [page, setPage] = useState(0)
  const [direction, setDirection] = useState(1)

  // A style is "selected" if the user just clicked it (local state) OR if
  // it was previously confirmed and persisted in the moodboard.
  const isStyleSelected = useCallback(
    (styleId: string) =>
      selectedStyle?.id === styleId || (confirmedStyleIds?.includes(styleId) ?? false),
    [selectedStyle, confirmedStyleIds]
  )

  const handleCardClick = useCallback(
    (style: DeliverableStyle) => {
      if (isLoading) return
      setSelectedStyle((prev) => (prev?.id === style.id ? null : style))
    },
    [isLoading]
  )

  const handleConfirm = useCallback(() => {
    if (selectedStyle && onConfirmSelection) {
      onConfirmSelection([selectedStyle])
      setSelectedStyle(null)
    }
  }, [selectedStyle, onConfirmSelection])

  const goForward = useCallback(() => {
    setDirection(1)
    setPage((p) => p + 1)
  }, [])

  const goBack = useCallback(() => {
    setDirection(-1)
    setPage((p) => Math.max(0, p - 1))
  }, [])

  // Sort by brandMatchScore descending — best matches first
  const sortedStyles = useMemo(
    () => [...styles].sort((a, b) => (b.brandMatchScore ?? 0) - (a.brandMatchScore ?? 0)),
    [styles]
  )

  // Best match only flagged when score meets threshold
  const bestMatchId =
    sortedStyles.length > 0 && (sortedStyles[0].brandMatchScore ?? 0) >= BEST_MATCH_THRESHOLD
      ? sortedStyles[0].id
      : null

  const totalPages = Math.ceil(sortedStyles.length / PAGE_SIZE)
  const pageStyles = sortedStyles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const hasStyles = sortedStyles.length > 0
  const hasMultiplePages = totalPages > 1
  const remainingCount = sortedStyles.length - (page + 1) * PAGE_SIZE

  // All cards rendered as equal portrait cards — no hero/compact split

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-background', className)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crafted-green/10 flex items-center justify-center">
              <Palette className="h-4 w-4 text-crafted-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-none">
                Visual Direction
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {page === 0 ? 'Top picks for your project' : `Page ${page + 1} of ${totalPages}`}
              </p>
            </div>
          </div>
          {hasStyles && onShowDifferent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-3 h-8 text-xs text-muted-foreground font-medium"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle
            </Button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!hasStyles && isLoading ? (
          <div className="py-6">
            <SkeletonCards />
          </div>
        ) : !hasStyles ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <Palette className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Preparing style options...</p>
          </div>
        ) : hasStyles && isLoading ? (
          <div className="py-6">
            <SkeletonCards />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-3">
            {/* Card area — slides on page change */}
            <div className="overflow-x-clip">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={page}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 350, damping: 35 },
                    opacity: { duration: 0.2 },
                  }}
                  className="space-y-2.5"
                >
                  {/* 3 portrait cards side by side */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {pageStyles.map((style, index) => (
                      <PortraitStyleCard
                        key={style.id}
                        style={style}
                        index={index}
                        isSelected={isStyleSelected(style.id)}
                        isBestMatch={style.id === bestMatchId}
                        disabled={isLoading}
                        onClick={() => handleCardClick(style)}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination controls */}
            {hasMultiplePages && (
              <div className="flex items-center justify-between gap-2">
                {/* Back button */}
                {page > 0 ? (
                  <button
                    onClick={goBack}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1.5 py-2 px-3 rounded-lg',
                      'text-xs font-medium transition-colors duration-200',
                      'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      isLoading && 'pointer-events-none opacity-50'
                    )}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {/* Next / more button */}
                {remainingCount > 0 && (
                  <button
                    onClick={goForward}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-1.5 py-2 px-3 rounded-lg',
                      'text-xs font-medium transition-colors duration-200',
                      'text-muted-foreground hover:text-foreground',
                      'border border-dashed border-border/60 hover:border-border',
                      'hover:bg-muted/30',
                      isLoading && 'pointer-events-none opacity-50'
                    )}
                  >
                    {remainingCount} more style{remainingCount !== 1 ? 's' : ''}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky confirm bar */}
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
