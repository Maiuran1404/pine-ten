'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PenTool, Type, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { DesignSpec } from '@/lib/ai/briefing-state-machine'
import type { Dimension } from '@/components/chat/brief-panel/types'
import {
  ImagePlaceholder,
  TextLines,
  ButtonShape,
  CircleIcon,
  BlockRect,
} from '@/components/chat/wireframe'

// =============================================================================
// PROPS
// =============================================================================

interface DesignSpecViewProps {
  specification: DesignSpec
  className?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ELEMENT_COLORS = [
  'bg-blue-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-cyan-400',
]

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultDimensionIndex(dimensions: Dimension[]): number {
  const defaultIdx = dimensions.findIndex((d) => d.isDefault)
  return defaultIdx >= 0 ? defaultIdx : 0
}

function detectElementType(element: string): string {
  const lower = element.toLowerCase()
  if (lower.includes('logo') || lower.includes('brand')) return 'logo'
  if (lower.includes('headline') || lower.includes('title') || lower.includes('text'))
    return 'headline'
  if (
    lower.includes('image') ||
    lower.includes('photo') ||
    lower.includes('visual') ||
    lower.includes('product')
  )
    return 'image'
  if (lower.includes('cta') || lower.includes('button')) return 'cta'
  if (lower.includes('icon')) return 'icon'
  return 'block'
}

// =============================================================================
// SPEC HEADER
// =============================================================================

function SpecHeader({ format }: { format: string }) {
  return (
    <div className="flex items-center gap-2">
      <PenTool className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">Design Specification</span>
      {format && (
        <Badge variant="outline" className="text-xs">
          {format}
        </Badge>
      )}
    </div>
  )
}

// =============================================================================
// ELEMENT PLACEHOLDER — renders appropriate wireframe shape
// =============================================================================

function ElementPlaceholder({ element, index }: { element: string; index: number }) {
  const type = detectElementType(element)

  switch (type) {
    case 'logo':
      return <BlockRect className="w-12 h-6" />
    case 'headline':
      return <TextLines lines={2} widths={[90, 60]} size="md" className="w-3/4" />
    case 'image':
      return <ImagePlaceholder className="w-full h-20" />
    case 'cta':
      return <ButtonShape width="w-24" />
    case 'icon':
      return <CircleIcon size="md" />
    default:
      return <BlockRect className={cn('h-6', index % 2 === 0 ? 'w-16' : 'w-20')} />
  }
}

// =============================================================================
// ARTBOARD PREVIEW (stacked, full-width)
// =============================================================================

function ArtboardPreview({
  dimension,
  keyElements,
}: {
  dimension: Dimension
  keyElements: string[]
}) {
  const aspectRatio = dimension.width / dimension.height

  return (
    <div className="space-y-2">
      {/* Dimension label */}
      <p className="text-xs text-muted-foreground text-center font-mono tabular-nums">
        {dimension.width} x {dimension.height}px ({dimension.label})
      </p>

      {/* Artboard */}
      <div className="flex items-center justify-center">
        <div
          className={cn(
            'relative border-dashed border-2 border-slate-300 dark:border-slate-600',
            'rounded-lg overflow-hidden bg-muted/20 border-border/60'
          )}
          style={{
            aspectRatio: `${dimension.width} / ${dimension.height}`,
            width: aspectRatio >= 1 ? '100%' : 'auto',
            height: aspectRatio < 1 ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: '24rem',
          }}
        >
          {/* Element placeholders */}
          <div className="absolute inset-0 flex flex-col items-center justify-between p-4 gap-2">
            {keyElements.length > 0 ? (
              keyElements.map((el, i) => (
                <div key={el} className="flex items-center justify-center w-full">
                  <ElementPlaceholder element={el} index={i} />
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <ImagePlaceholder className="w-3/4 h-3/4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DIMENSION CHIPS
// =============================================================================

function DimensionChips({
  dimensions,
  activeIndex,
  onSelect,
}: {
  dimensions: Dimension[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  if (dimensions.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {dimensions.map((dim, i) => (
        <button
          key={dim.label}
          onClick={() => onSelect(i)}
          className={cn(
            'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
            i === activeIndex
              ? 'bg-emerald-600 text-white'
              : 'bg-transparent text-muted-foreground hover:bg-muted'
          )}
        >
          {dim.label} ({dim.width}x{dim.height})
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// PROPERTIES GRID (full-width, 2-col)
// =============================================================================

function PropertiesGrid({
  keyElements,
  copyGuidance,
  exactCopy,
  layoutNotes,
}: {
  keyElements: string[]
  copyGuidance: string
  exactCopy?: string[]
  layoutNotes?: string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Element List */}
      {keyElements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Key Elements</span>
          </div>
          <ul className="space-y-1.5">
            {keyElements.map((element, i) => (
              <li key={element} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    ELEMENT_COLORS[i % ELEMENT_COLORS.length]
                  )}
                />
                <span className="text-xs text-foreground">{element}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Copy Guidance */}
      {copyGuidance && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Copy Guidance</span>
          </div>
          <div className="border-l-2 border-primary/40 pl-3 py-1">
            <p className="text-xs text-muted-foreground italic leading-relaxed">{copyGuidance}</p>
          </div>
        </div>
      )}

      {/* Exact Copy */}
      {exactCopy && exactCopy.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Exact Copy</span>
          </div>
          <ul className="space-y-1">
            {exactCopy.map((copy, i) => (
              <li
                key={i}
                className="text-xs text-foreground border-l-2 border-blue-400/40 pl-2 py-0.5"
              >
                {copy}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layout Notes */}
      {layoutNotes && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Layout Notes</span>
          </div>
          <p className="text-xs text-muted-foreground italic leading-relaxed">{layoutNotes}</p>
        </div>
      )}
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
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DesignSpecView({ specification, className }: DesignSpecViewProps) {
  const [activeDimIndex, setActiveDimIndex] = useState(() =>
    getDefaultDimensionIndex(specification.dimensions)
  )

  const isEmpty =
    !specification.format &&
    specification.dimensions.length === 0 &&
    specification.keyElements.length === 0 &&
    !specification.copyGuidance

  if (isEmpty) {
    return <DesignSpecEmpty />
  }

  const activeDimension = specification.dimensions[activeDimIndex] ?? specification.dimensions[0]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <SpecHeader format={specification.format} />

      {/* Stacked layout — full width */}
      {specification.dimensions.length > 0 && activeDimension && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DimensionChips
            dimensions={specification.dimensions}
            activeIndex={activeDimIndex}
            onSelect={setActiveDimIndex}
          />
          <ArtboardPreview dimension={activeDimension} keyElements={specification.keyElements} />
        </motion.div>
      )}

      {/* Properties below as 2-col grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <PropertiesGrid
          keyElements={specification.keyElements}
          copyGuidance={specification.copyGuidance}
        />
      </motion.div>
    </motion.div>
  )
}
