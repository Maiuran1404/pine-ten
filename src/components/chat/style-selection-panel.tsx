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

function PanelStyleCard({
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
  const tags = style.semanticTags?.slice(0, 3) ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.12 },
        y: { duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] },
      }}
      className="flex flex-col"
    >
      <motion.button
        whileHover="hover"
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl cursor-pointer group w-full text-left',
          'transition-shadow duration-300',
          isSelected
            ? 'ring-2 ring-crafted-green shadow-lg shadow-crafted-green/10'
            : 'ring-1 ring-border/50 hover:ring-border'
        )}
      >
        {/* Image container with zoom effect */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <motion.div
            className="w-full h-full"
            variants={{
              hover: { scale: 1.06 },
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={style.imageUrl}
              alt={style.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  'https://via.placeholder.com/400x225?text=Style'
              }}
            />
          </motion.div>

          {/* Gradient overlay — deepens on hover */}
          <div
            className={cn(
              'absolute inset-0 transition-all duration-500',
              'bg-gradient-to-t from-black/60 via-black/10 to-transparent',
              'group-hover:from-black/70 group-hover:via-black/20'
            )}
          />

          {/* Best match badge */}
          <AnimatePresence>
            {isBestMatch && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{
                  delay: index * 0.12 + 0.3,
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                }}
                className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 bg-crafted-green/90 backdrop-blur-sm rounded-full text-[10px] text-white font-medium"
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
          <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 pt-8">
            <p className="text-white text-sm font-semibold">{style.name}</p>
            {style.description && (
              <motion.p
                className="text-white/60 text-xs mt-0.5 line-clamp-2 leading-relaxed"
                variants={{
                  hover: { color: 'rgba(255,255,255,0.8)' },
                }}
                transition={{ duration: 0.3 }}
              >
                {style.description}
              </motion.p>
            )}
          </div>
        </div>

        {/* Tags row — below image */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 capitalize"
              >
                {tag}
              </span>
            ))}
            {style.matchReason && (
              <span className="ml-auto text-[10px] text-crafted-sage truncate max-w-[120px]">
                {style.matchReason}
              </span>
            )}
          </div>
        )}
      </motion.button>
    </motion.div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-[3/4] bg-muted-foreground/10" />
          <div className="p-3 space-y-2 bg-muted/30">
            <div className="h-3.5 w-32 bg-muted-foreground/10 rounded" />
            <div className="flex gap-1.5">
              <div className="h-4 w-14 bg-muted-foreground/10 rounded-full" />
              <div className="h-4 w-16 bg-muted-foreground/10 rounded-full" />
              <div className="h-4 w-12 bg-muted-foreground/10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

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

  const topScore = displayedStyles[0]?.brandMatchScore ?? 0
  const bestMatchId =
    topScore >= 70
      ? displayedStyles.reduce((best, s) =>
          (s.brandMatchScore ?? 0) > (best.brandMatchScore ?? 0) ? s : best
        ).id
      : null

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
          )}
        </div>
      </div>

      {/* Content — vertical stack */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!hasStyles && isLoading ? (
            <SkeletonCards />
          ) : !hasStyles ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Palette className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Preparing style options...</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {displayedStyles.map((style, index) => (
                <PanelStyleCard
                  key={style.id}
                  style={style}
                  index={index}
                  isSelected={selectedStyle?.id === style.id}
                  isBestMatch={bestMatchId === style.id}
                  onClick={() => handleCardClick(style)}
                />
              ))}
            </div>
          )}

          {/* Confirm button — slides in when a style is selected */}
          <AnimatePresence>
            {selectedStyle && onConfirmSelection && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                className="mt-4"
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
      </ScrollArea>
    </div>
  )
}
