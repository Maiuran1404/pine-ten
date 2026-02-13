'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, ArrowRight, ChevronDown, ChevronUp, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type MoodboardItem } from './types'

interface InlineCollectionProps {
  items: MoodboardItem[]
  onRemoveItem: (id: string) => void
  onClearAll: () => void
  onContinue: () => void
  isLoading?: boolean
}

export function InlineCollection({
  items,
  onRemoveItem,
  onClearAll,
  onContinue,
  isLoading = false,
}: InlineCollectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (items.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-muted/50 border border-border rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Palette className="w-4 h-4" />
          <span>Your collection ({items.length})</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Collapsible content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin scrollbar-thumb-border">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="relative shrink-0 group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'https://via.placeholder.com/64x64?text=?'
                        }}
                      />
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className={cn(
                        'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full',
                        'bg-background border border-border shadow-sm',
                        'flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'hover:bg-destructive hover:border-destructive hover:text-destructive-foreground'
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Style name tooltip */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-md whitespace-nowrap max-w-24 truncate">
                        {item.name}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Continue button */}
            <Button
              onClick={onContinue}
              disabled={isLoading || items.length === 0}
              className="w-full gap-2"
              size="sm"
            >
              Continue with {items.length === 1 ? 'this style' : `these ${items.length} styles`}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state shows just the count */}
      {!isExpanded && (
        <Button
          onClick={onContinue}
          disabled={isLoading || items.length === 0}
          className="w-full gap-2"
          size="sm"
        >
          Continue with {items.length === 1 ? 'this style' : `these ${items.length} styles`}
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </motion.div>
  )
}
