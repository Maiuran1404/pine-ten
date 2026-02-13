'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Check, Search, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { STYLE_AXES } from '@/lib/constants/reference-libraries'

export interface DeliverableStyle {
  id: string
  name: string
  description: string | null
  imageUrl: string
  deliverableType: string
  styleAxis: string
  subStyle: string | null
  semanticTags: string[]
  // Brand-aware scoring fields
  brandMatchScore?: number
  matchReason?: string
  // Example output support
  exampleOutputUrl?: string | null
}

interface DeliverableStyleGridProps {
  styles: DeliverableStyle[]
  selectedStyles: string[]
  onSelectStyle: (style: DeliverableStyle) => void
  onShowMore?: (styleAxis: string) => void
  onShowDifferent?: () => void
  isLoading?: boolean
  // New props for pagination info
  totalAvailable?: number
  shownAxes?: string[]
}

export function DeliverableStyleGrid({
  styles,
  selectedStyles,
  onSelectStyle,
  onShowMore,
  onShowDifferent,
  isLoading,
  shownAxes,
}: DeliverableStyleGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [exampleModal, setExampleModal] = useState<{
    style: DeliverableStyle
    url: string
  } | null>(null)
  const [hoveredStyleId, setHoveredStyleId] = useState<string | null>(null)

  // Filter styles by search query
  const filteredStyles = useMemo(() => {
    if (!searchQuery.trim()) return styles
    const query = searchQuery.toLowerCase()
    return styles.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.styleAxis.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.semanticTags?.some((t) => t.toLowerCase().includes(query))
    )
  }, [styles, searchQuery])

  if (!styles || styles.length === 0) {
    return null
  }

  // Calculate available axes for "show different" button
  const currentAxes = new Set(styles.map((s) => s.styleAxis))
  const allKnownAxes = STYLE_AXES.map((a) => a.value)
  const seenAxes = new Set([...(shownAxes || []), ...currentAxes])
  const remainingAxes = allKnownAxes.filter((a) => !seenAxes.has(a))
  const hasMoreDifferentStyles = remainingAxes.length > 0

  return (
    <div className="space-y-4">
      {/* Search toggle - only show if many styles */}
      {styles.length > 6 && (
        <div className="flex justify-end">
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? <X className="w-3 h-3" /> : <Search className="w-3 h-3" />}
            {showSearch ? 'Close' : 'Search'}
          </button>
        </div>
      )}

      {/* Search input */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* No results message */}
      {filteredStyles.length === 0 && searchQuery && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No styles found for &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Clean grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {filteredStyles.map((style) => {
          const isSelected = selectedStyles.includes(style.id)
          const isHovered = hoveredStyleId === style.id

          return (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style)}
              onMouseEnter={() => setHoveredStyleId(style.id)}
              onMouseLeave={() => setHoveredStyleId(null)}
              className={cn(
                'relative aspect-[4/5] rounded-xl overflow-hidden transition-all duration-200',
                isHovered && 'scale-110 z-10 shadow-2xl',
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl'
                  : isHovered && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background'
              )}
            >
              {/* Image */}
              <Image
                src={style.imageUrl}
                alt={style.name}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />

              {/* Hover overlay with name - only visible on THIS card's hover */}
              {(isHovered || isSelected) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-sm font-medium truncate">{style.name}</p>
                  </div>

                  {/* Example output button - only on hover */}
                  {style.exampleOutputUrl && isHovered && (
                    <button
                      className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/90 text-black hover:bg-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExampleModal({
                          style,
                          url: style.exampleOutputUrl!,
                        })
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Minimal action links */}
      {(onShowMore || onShowDifferent) && (
        <div className="flex items-center gap-4 text-xs">
          {onShowMore && filteredStyles.length > 0 && (
            <button
              onClick={() => onShowMore(filteredStyles[0].styleAxis)}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              More like these →
            </button>
          )}
          {onShowDifferent && hasMoreDifferentStyles && (
            <button
              onClick={onShowDifferent}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Show different
            </button>
          )}
        </div>
      )}

      {/* Example Output Modal */}
      <Dialog open={!!exampleModal} onOpenChange={(open) => !open && setExampleModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{exampleModal?.style.name}</DialogTitle>
          </DialogHeader>
          {exampleModal && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-[4/3]">
                <Image
                  src={exampleModal.url}
                  alt={`Example output for ${exampleModal.style.name}`}
                  fill
                  sizes="(max-width: 672px) 100vw, 672px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between">
                {exampleModal.style.description && (
                  <p className="text-sm text-muted-foreground">{exampleModal.style.description}</p>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    onSelectStyle(exampleModal.style)
                    setExampleModal(null)
                  }}
                >
                  Select
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
