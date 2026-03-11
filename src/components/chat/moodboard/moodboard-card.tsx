'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, GripVertical, Palette, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type MoodboardItem } from '../types'

interface MoodboardCardProps {
  item: MoodboardItem
  onRemove: (id: string) => void
  onApplyToScene?: (item: MoodboardItem, sceneNumber: number) => void
  sceneCount?: number
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
  className?: string
}

export function MoodboardCard({
  item,
  onRemove,
  onApplyToScene,
  sceneCount = 0,
  isDragging = false,
  dragHandleProps,
  className,
}: MoodboardCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isColor = item.type === 'color'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative rounded-lg overflow-hidden border border-border bg-card',
        'transition-all duration-200',
        isDragging && 'shadow-lg ring-2 ring-primary/50 z-50',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className={cn(
            'absolute top-1 left-1 z-10 p-1 rounded cursor-grab active:cursor-grabbing',
            'bg-black/40 text-white opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
        >
          <GripVertical className="h-3 w-3" />
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        className={cn(
          'absolute top-1 right-1 z-10 p-1 rounded-full',
          'bg-black/40 text-white opacity-0 group-hover:opacity-100',
          'hover:bg-destructive transition-all duration-200'
        )}
        aria-label={`Remove ${item.name} from moodboard`}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Apply to scene button (#15) */}
      {onApplyToScene && sceneCount > 0 && item.type !== 'color' && (
        <div className="absolute bottom-[calc(100%-theme(spacing.1))] right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="relative group/apply">
            <button
              type="button"
              className="p-1 rounded-full bg-black/40 text-white hover:bg-crafted-green transition-colors"
              aria-label="Apply to scene"
              title="Apply to scene"
            >
              <Film className="h-3 w-3" />
            </button>
            <div className="absolute bottom-full right-0 mb-1 hidden group-hover/apply:block min-w-[100px]">
              <div className="bg-popover border border-border rounded-md shadow-lg py-1 text-xs">
                {Array.from({ length: sceneCount }, (_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApplyToScene(item, i + 1)
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-muted transition-colors text-foreground"
                  >
                    Scene {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isColor ? (
        // Color swatch display
        <div
          className="aspect-square"
          style={{
            backgroundColor: item.metadata?.colorSamples?.[0] || '#888',
          }}
        >
          {item.metadata?.colorSamples && item.metadata.colorSamples.length > 1 && (
            <div className="absolute inset-0 flex">
              {item.metadata.colorSamples.map((color, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Image display
        <div className="aspect-square bg-muted relative">
          {!imageError && item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className={cn(
                'w-full h-full object-cover',
                'transition-transform duration-300',
                isHovered && 'scale-105'
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Label - always visible for better clarity */}
      <div className="p-1.5 bg-background/80 border-t border-border">
        <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
        {item.metadata?.styleAxis && (
          <p className="text-[9px] text-muted-foreground truncate capitalize">
            {item.metadata.styleAxis}
          </p>
        )}
      </div>
    </motion.div>
  )
}
