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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={style.imageUrl}
          alt={style.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=Style'
          }}
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <p className="text-white text-xs font-medium truncate">{style.name}</p>
          {style.matchReason && (
            <p className="text-white/70 text-[10px] truncate mt-0.5">{style.matchReason}</p>
          )}
        </div>

        {isBestMatch && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-crafted-green rounded-full text-[10px] text-white font-medium">
            <Sparkles className="w-2.5 h-2.5" />
            Best match
          </div>
        )}

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

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-video bg-muted-foreground/10" />
          <div className="p-2 space-y-1.5">
            <div className="h-3 w-20 bg-muted-foreground/10 rounded" />
            <div className="h-2 w-28 bg-muted-foreground/10 rounded" />
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

  const displayedStyles = styles.slice(0, 4)

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

      {/* Content */}
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
            <div className="grid grid-cols-2 gap-3">
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
        </div>
      </ScrollArea>

      {/* Confirm pill */}
      <AnimatePresence>
        {selectedStyle && onConfirmSelection && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 px-4 py-3 border-t border-border/40"
          >
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full rounded-full gap-1.5"
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
