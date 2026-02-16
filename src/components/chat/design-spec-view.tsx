'use client'

import { motion } from 'framer-motion'
import { Ruler, Type, Sparkles, PenTool } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DesignSpec } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface DesignSpecViewProps {
  specification: DesignSpec
  className?: string
}

// =============================================================================
// DIMENSION PILL
// =============================================================================

function DimensionPill({ width, height, label }: { width: number; height: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-white/60 dark:bg-card/60 px-3 py-2">
      {/* Visual ratio preview */}
      <div className="shrink-0 w-8 h-8 rounded border border-border/50 bg-muted/30 flex items-center justify-center">
        <div
          className="bg-primary/20 rounded-sm"
          style={{
            width: `${Math.min(24, (width / Math.max(width, height)) * 24)}px`,
            height: `${Math.min(24, (height / Math.max(width, height)) * 24)}px`,
          }}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {width} x {height}px
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function DesignSpecEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <PenTool className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Design specification will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Format, dimensions, key elements, and copy guidance
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DesignSpecView({ specification, className }: DesignSpecViewProps) {
  const isEmpty =
    !specification.format &&
    specification.dimensions.length === 0 &&
    specification.keyElements.length === 0 &&
    !specification.copyGuidance

  if (isEmpty) {
    return <DesignSpecEmpty />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <PenTool className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Design Specification</span>
      </div>

      {/* Format */}
      {specification.format && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Format:</span>
          <Badge variant="outline" className="text-xs">
            {specification.format}
          </Badge>
        </motion.div>
      )}

      {/* Dimensions */}
      {specification.dimensions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Dimensions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {specification.dimensions.map((dim) => (
              <DimensionPill
                key={dim.label}
                width={dim.width}
                height={dim.height}
                label={dim.label}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Key Elements */}
      {specification.keyElements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Key Elements</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {specification.keyElements.map((element) => (
              <Badge key={element} variant="secondary" className="text-xs">
                {element}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Copy Guidance */}
      {specification.copyGuidance && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Copy Guidance</span>
          </div>
          <div className="rounded-lg border border-border/40 bg-white/60 dark:bg-card/60 p-3">
            <p className="text-sm text-foreground leading-relaxed">{specification.copyGuidance}</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
