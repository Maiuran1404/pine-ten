'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, ChevronDown, ChevronRight, Plus, X, Type, Droplets, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VisualDirection } from '@/components/chat/brief-panel/types'

// =============================================================================
// PROPS
// =============================================================================

interface SectionMoodboardProps {
  /** Section identifier (e.g., "hero", "week-2") */
  sectionId: string
  /** Display label for the section */
  sectionLabel: string
  /** The global moodboard (for reference) */
  globalMoodboard: VisualDirection | null
  /** Per-section override (partial) */
  sectionOverride: Partial<VisualDirection> | null
  /** Callback when override changes */
  onOverrideChange: (sectionId: string, override: Partial<VisualDirection> | null) => void
  className?: string
}

// =============================================================================
// COLOR PALETTE EDITOR
// =============================================================================

function ColorPaletteEditor({
  colors,
  onChange,
}: {
  colors: string[]
  onChange: (colors: string[]) => void
}) {
  const [newColor, setNewColor] = useState('#')

  const handleAdd = () => {
    const trimmed = newColor.trim()
    if (trimmed && trimmed !== '#' && !colors.includes(trimmed)) {
      onChange([...colors, trimmed])
      setNewColor('#')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Droplets className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Color Overrides
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color) => (
          <div
            key={color}
            className="group relative flex items-center gap-1 rounded-full border border-border/40 bg-white/60 dark:bg-card/60 pl-1 pr-2 py-0.5"
          >
            <div
              className="w-4 h-4 rounded-full border border-border/50"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground">{color}</span>
            <button
              onClick={() => onChange(colors.filter((c) => c !== color))}
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
        {/* Add color */}
        <div className="flex items-center gap-1">
          <Input
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="#hex"
            className="h-6 w-20 text-[10px] px-2"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAdd}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// KEYWORD EDITOR
// =============================================================================

function KeywordEditor({
  label,
  icon: Icon,
  keywords,
  onChange,
  placeholder,
}: {
  label: string
  icon: typeof Sparkles
  keywords: string[]
  onChange: (keywords: string[]) => void
  placeholder: string
}) {
  const [newKeyword, setNewKeyword] = useState('')

  const handleAdd = () => {
    const trimmed = newKeyword.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed])
      setNewKeyword('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <Badge key={keyword} variant="secondary" className="text-[10px] gap-1 pr-1">
            {keyword}
            <button onClick={() => onChange(keywords.filter((k) => k !== keyword))}>
              <X className="h-2.5 w-2.5 hover:text-destructive" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={placeholder}
            className="h-6 w-24 text-[10px] px-2"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAdd}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// GLOBAL REFERENCE SUMMARY
// =============================================================================

function GlobalReferenceSummary({ moodboard }: { moodboard: VisualDirection }) {
  return (
    <div className="rounded-lg border border-border/20 bg-muted/10 p-2.5 space-y-1.5">
      <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
        Global Direction (base)
      </span>
      <div className="flex flex-wrap gap-1">
        {moodboard.moodKeywords.slice(0, 4).map((kw) => (
          <Badge key={kw} variant="outline" className="text-[9px] h-4 text-muted-foreground/60">
            {kw}
          </Badge>
        ))}
        {moodboard.colorPalette.slice(0, 4).map((color) => (
          <div
            key={color}
            className="w-4 h-4 rounded-full border border-border/30"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function MoodboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Palette className="h-6 w-6 text-muted-foreground/50 mb-2" />
      <p className="text-xs text-muted-foreground">No section overrides</p>
      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Uses global visual direction</p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SectionMoodboard({
  sectionId,
  sectionLabel,
  globalMoodboard,
  sectionOverride,
  onOverrideChange,
  className,
}: SectionMoodboardProps) {
  const [isExpanded, setIsExpanded] = useState(sectionOverride != null)
  const hasOverride = sectionOverride != null

  const currentOverride: Partial<VisualDirection> = sectionOverride ?? {}

  const handleUpdateOverride = (updates: Partial<VisualDirection>) => {
    const merged = { ...currentOverride, ...updates }
    // Clean up empty arrays
    const cleaned = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => {
        if (Array.isArray(v)) return v.length > 0
        if (typeof v === 'object' && v !== null) return Object.values(v).some(Boolean)
        return v != null
      })
    ) as Partial<VisualDirection>

    if (Object.keys(cleaned).length === 0) {
      onOverrideChange(sectionId, null)
    } else {
      onOverrideChange(sectionId, cleaned)
    }
  }

  const handleClearOverride = () => {
    onOverrideChange(sectionId, null)
    setIsExpanded(false)
  }

  return (
    <div className={cn('border border-border/40 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Palette className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{sectionLabel}</span>
          {hasOverride && (
            <Badge variant="default" className="text-[9px] h-4">
              Custom
            </Badge>
          )}
        </div>
        {!hasOverride && <span className="text-[10px] text-muted-foreground">Uses global</span>}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Global reference */}
              {globalMoodboard && <GlobalReferenceSummary moodboard={globalMoodboard} />}

              {!hasOverride ? <MoodboardEmpty /> : null}

              {/* Override editors */}
              <KeywordEditor
                label="Mood Keywords"
                icon={Sparkles}
                keywords={currentOverride.moodKeywords ?? []}
                onChange={(moodKeywords) => handleUpdateOverride({ moodKeywords })}
                placeholder="e.g. raw"
              />

              <ColorPaletteEditor
                colors={currentOverride.colorPalette ?? []}
                onChange={(colorPalette) => handleUpdateOverride({ colorPalette })}
              />

              <KeywordEditor
                label="Avoid"
                icon={Type}
                keywords={currentOverride.avoidElements ?? []}
                onChange={(avoidElements) => handleUpdateOverride({ avoidElements })}
                placeholder="e.g. gradients"
              />

              {/* Clear button */}
              {hasOverride && (
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearOverride}
                    className="text-xs text-muted-foreground h-7"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Override
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
