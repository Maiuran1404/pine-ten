'use client'

import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Check, ArrowRight, RefreshCw, Shuffle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type DeliverableStyle } from './types'

interface StyleSelectionGridProps {
  styles: DeliverableStyle[]
  collectionStyleIds: string[]
  onCardClick?: (style: DeliverableStyle) => void
  onAddToCollection: (style: DeliverableStyle) => void
  onRemoveFromCollection: (styleId: string) => void
  onConfirmSelection?: (selectedStyles: DeliverableStyle[]) => void
  onShowMore?: (styleAxis: string) => void
  onShowDifferent?: () => void
  isLoading?: boolean
  className?: string
}

function StyleCard({
  style,
  index,
  isSelected,
  isBestMatch,
  onClick,
}: {
  style: DeliverableStyle
  index: number
  isSelected: boolean
  isBestMatch: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        y: { duration: 0.35, delay: index * 0.08 },
      }}
      className="flex flex-col gap-1.5"
    >
      <motion.button
        whileHover={{ scale: 1.03, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer group aspect-video w-full',
          isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-2 hover:ring-primary/30'
        )}
      >
        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={style.imageUrl}
          alt={style.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=Style'
          }}
        />

        {/* Subtle hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {/* Persistent bottom gradient with name + match reason */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <p className="text-white text-xs font-medium truncate">{style.name}</p>
          {style.matchReason && (
            <p className="text-white/70 text-[10px] truncate mt-0.5">{style.matchReason}</p>
          )}
        </div>

        {/* Best match badge */}
        {isBestMatch && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-emerald-600 rounded-full text-[10px] text-white font-medium">
            <Sparkles className="w-2.5 h-2.5" />
            Best match
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-1.5 right-1.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        )}
      </motion.button>
    </motion.div>
  )
}

export function StyleSelectionGrid({
  styles,
  collectionStyleIds: _collectionStyleIds,
  onAddToCollection: _onAddToCollection,
  onRemoveFromCollection: _onRemoveFromCollection,
  onConfirmSelection,
  onShowMore,
  onShowDifferent,
  isLoading,
  className,
}: StyleSelectionGridProps) {
  const [selectedStyle, setSelectedStyle] = useState<DeliverableStyle | null>(null)

  if (!styles || styles.length === 0) {
    return null
  }

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

  const displayedStyles = styles.slice(0, 3)

  // Best match: top-scored card when brandMatchScore >= 70
  const topScore = displayedStyles[0]?.brandMatchScore ?? 0
  const bestMatchId =
    topScore >= 70
      ? displayedStyles.reduce((best, s) =>
          (s.brandMatchScore ?? 0) > (best.brandMatchScore ?? 0) ? s : best
        ).id
      : null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with discovery buttons inline */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Style References</h3>
        <div className="flex items-center gap-2">
          {onShowMore && displayedStyles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowMore(displayedStyles[0].styleAxis)}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-3 h-7 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
              More
            </Button>
          )}
          {onShowDifferent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-3 h-7 text-xs text-muted-foreground"
            >
              <Shuffle className="w-3 h-3" />
              Different
            </Button>
          )}
        </div>
      </div>

      {/* Compact 3-column grid on desktop / horizontal scroll on mobile */}
      <LayoutGroup>
        {/* Mobile: horizontal snap scroll */}
        <div className="flex sm:hidden gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayedStyles.map((style, index) => (
            <div key={style.id} className="min-w-[240px] snap-center shrink-0">
              <StyleCard
                style={style}
                index={index}
                isSelected={selectedStyle?.id === style.id}
                isBestMatch={bestMatchId === style.id}
                onClick={() => handleCardClick(style)}
              />
            </div>
          ))}
          <div className="min-w-[32px] shrink-0" aria-hidden />
        </div>

        {/* Desktop: compact 3-column grid */}
        <div className="hidden sm:grid grid-cols-3 gap-3">
          {displayedStyles.map((style, index) => (
            <StyleCard
              key={style.id}
              style={style}
              index={index}
              isSelected={selectedStyle?.id === style.id}
              isBestMatch={bestMatchId === style.id}
              onClick={() => handleCardClick(style)}
            />
          ))}
        </div>
      </LayoutGroup>

      {/* Compact confirm pill — appears below grid when a style is selected */}
      <AnimatePresence>
        {selectedStyle && onConfirmSelection && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-4 h-8"
            >
              Continue with {selectedStyle.name}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
