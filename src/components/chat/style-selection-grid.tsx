'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

interface StyleCardProps {
  style: DeliverableStyle
  index: number
  isSelected: boolean
  isHero: boolean
  isBestMatch: boolean
  onClick: () => void
}

function StyleCard({ style, index, isSelected, isHero, isBestMatch, onClick }: StyleCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="flex flex-col gap-2"
    >
      <motion.button
        whileHover={{ scale: 1.03, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative overflow-hidden rounded-2xl transition-shadow duration-200 w-full',
          isHero ? 'aspect-[16/9]' : 'aspect-[4/5]',
          isSelected
            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl'
            : 'hover:shadow-2xl hover:ring-2 hover:ring-primary/30 hover:ring-offset-2 hover:ring-offset-background'
        )}
      >
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={style.imageUrl}
          alt={style.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x500?text=Style'
          }}
        />

        {/* Hover / selected overlay with gradient */}
        <AnimatePresence>
          {(isHovered || isSelected) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Best match badge */}
        {isBestMatch && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-white text-xs font-medium">
            <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
            Best match
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-2.5 right-2.5">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </motion.button>

      {/* Always-visible card info below the thumbnail */}
      <div className="px-0.5">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{style.name}</p>
        {style.matchReason && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{style.matchReason}</p>
        )}
      </div>
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

  // Limit to showing only 3 styles
  const displayedStyles = styles.slice(0, 3)

  // Determine hero layout: only when top card leads by 10+ points
  const topScore = displayedStyles[0]?.brandMatchScore ?? 0
  const secondScore = displayedStyles[1]?.brandMatchScore ?? 0
  const useHeroLayout = topScore - secondScore >= 10

  const heroStyle = displayedStyles[0]
  const supportingStyles = displayedStyles.slice(1)

  // Best match = highest-scored card with brandMatchScore >= 70
  const bestMatchId =
    topScore >= 70
      ? displayedStyles.reduce((best, s) =>
          (s.brandMatchScore ?? 0) > (best.brandMatchScore ?? 0) ? s : best
        ).id
      : null

  return (
    <div className={cn('space-y-4', className)}>
      {useHeroLayout ? (
        /* Hero + Supporting layout */
        <div className="space-y-3 max-w-2xl">
          {/* Hero card — full width */}
          {heroStyle && (
            <StyleCard
              style={heroStyle}
              index={0}
              isSelected={selectedStyle?.id === heroStyle.id}
              isHero={true}
              isBestMatch={bestMatchId === heroStyle.id}
              onClick={() => handleCardClick(heroStyle)}
            />
          )}

          {/* Supporting cards — 2-column row */}
          {supportingStyles.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {supportingStyles.map((style, i) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  index={i + 1}
                  isSelected={selectedStyle?.id === style.id}
                  isHero={false}
                  isBestMatch={bestMatchId === style.id}
                  onClick={() => handleCardClick(style)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Equal sizing — hero card still full width, supporting in 2-col, but hero uses same aspect as supporting */
        <div className="space-y-3 max-w-2xl">
          {heroStyle && (
            <StyleCard
              style={heroStyle}
              index={0}
              isSelected={selectedStyle?.id === heroStyle.id}
              isHero={false}
              isBestMatch={bestMatchId === heroStyle.id}
              onClick={() => handleCardClick(heroStyle)}
            />
          )}
          {supportingStyles.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {supportingStyles.map((style, i) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  index={i + 1}
                  isSelected={selectedStyle?.id === style.id}
                  isHero={false}
                  isBestMatch={bestMatchId === style.id}
                  onClick={() => handleCardClick(style)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm button — shows when a style is selected */}
      <AnimatePresence>
        {selectedStyle && onConfirmSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Button onClick={handleConfirm} disabled={isLoading} className="w-full sm:w-auto">
              Continue with {selectedStyle.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery buttons — always visible */}
      {(onShowMore || onShowDifferent) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {onShowMore && displayedStyles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowMore(displayedStyles[0].styleAxis)}
              disabled={isLoading}
              className="rounded-full gap-2 px-4"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              More like these
            </Button>
          )}
          {onShowDifferent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading}
              className="rounded-full gap-2 px-4"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Show different styles
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
