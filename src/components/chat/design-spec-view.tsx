'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PenTool, Ruler, Type, Sparkles } from 'lucide-react'
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
// DIMENSION CALLOUTS
// =============================================================================

function DimensionCallouts({ width, height }: { width: number; height: number }) {
  return (
    <>
      {/* Top edge - width callout */}
      <div className="absolute -top-5 left-0 right-0 flex items-end justify-center">
        <div className="relative flex items-center w-full px-1">
          {/* Left cap */}
          <div className="w-px h-2 bg-slate-400 dark:bg-slate-500" />
          {/* Line */}
          <div className="flex-1 h-px bg-slate-400 dark:bg-slate-500" />
          {/* Label */}
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 text-[10px] text-muted-foreground font-mono tabular-nums">
            {width}px
          </span>
          {/* Right cap */}
          <div className="w-px h-2 bg-slate-400 dark:bg-slate-500" />
        </div>
      </div>

      {/* Left edge - height callout */}
      <div className="absolute -left-5 top-0 bottom-0 flex items-center justify-end">
        <div className="relative flex flex-col items-end h-full py-1">
          {/* Top cap */}
          <div className="h-px w-2 bg-slate-400 dark:bg-slate-500" />
          {/* Line */}
          <div className="w-px flex-1 bg-slate-400 dark:bg-slate-500" />
          {/* Label */}
          <span className="absolute top-1/2 -translate-y-1/2 -left-4 text-[10px] text-muted-foreground font-mono tabular-nums -rotate-90 whitespace-nowrap">
            {height}px
          </span>
          {/* Bottom cap */}
          <div className="h-px w-2 bg-slate-400 dark:bg-slate-500" />
        </div>
      </div>
    </>
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
// ARTBOARD PREVIEW (Left Panel)
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
    <div className="flex items-center justify-center">
      <div className="relative pl-10 pt-8">
        <DimensionCallouts width={dimension.width} height={dimension.height} />

        {/* Artboard */}
        <div
          className={cn(
            'relative border-dashed border-2 border-slate-300 dark:border-slate-600',
            'rounded-sm overflow-hidden'
          )}
          style={{
            aspectRatio: `${dimension.width} / ${dimension.height}`,
            width: aspectRatio >= 1 ? '100%' : 'auto',
            height: aspectRatio < 1 ? '100%' : 'auto',
            maxWidth: '20rem',
            maxHeight: '20rem',
            // Checkerboard background
            backgroundImage: [
              'linear-gradient(45deg, hsl(var(--muted) / 0.3) 25%, transparent 25%)',
              'linear-gradient(-45deg, hsl(var(--muted) / 0.3) 25%, transparent 25%)',
              'linear-gradient(45deg, transparent 75%, hsl(var(--muted) / 0.3) 75%)',
              'linear-gradient(-45deg, transparent 75%, hsl(var(--muted) / 0.3) 75%)',
            ].join(', '),
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          {/* Element placeholders */}
          <div className="absolute inset-0 flex flex-col items-center justify-between p-3 gap-2">
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
            'border',
            i === activeIndex
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
          )}
        >
          {dim.label} ({dim.width}x{dim.height})
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// PROPERTIES PANEL (Right Panel)
// =============================================================================

function PropertiesPanel({
  keyElements,
  copyGuidance,
}: {
  keyElements: string[]
  copyGuidance: string
}) {
  return (
    <div className="space-y-4">
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

      {/* Dimensions info */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Dimensions</span>
        </div>
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
      className={cn('space-y-3', className)}
    >
      {/* Header */}
      <SpecHeader format={specification.format} />

      {/* Two-panel layout */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Left panel — Artboard */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0 }}
          className="flex-1 min-w-0"
        >
          {specification.dimensions.length > 0 && activeDimension && (
            <>
              <DimensionChips
                dimensions={specification.dimensions}
                activeIndex={activeDimIndex}
                onSelect={setActiveDimIndex}
              />
              <ArtboardPreview
                dimension={activeDimension}
                keyElements={specification.keyElements}
              />
            </>
          )}
        </motion.div>

        {/* Right panel — Properties */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="sm:w-44 shrink-0"
        >
          <PropertiesPanel
            keyElements={specification.keyElements}
            copyGuidance={specification.copyGuidance}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
