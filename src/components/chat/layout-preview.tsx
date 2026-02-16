'use client'

import { motion } from 'framer-motion'
import { Layout, GripVertical, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { LayoutSection } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface LayoutPreviewProps {
  sections: LayoutSection[]
  className?: string
}

// =============================================================================
// SECTION CARD
// =============================================================================

function SectionRow({ section, index }: { section: LayoutSection; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group flex items-start gap-3 rounded-lg border border-border/40 bg-white/60 dark:bg-card/60 p-3 hover:border-border hover:bg-white/80 dark:hover:bg-card/80 transition-colors"
    >
      {/* Order indicator */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {section.order}
        </div>
        <GripVertical className="h-3 w-3 text-muted-foreground/30" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground">{section.sectionName}</h4>
        <p className="text-xs text-primary/80 dark:text-primary/70 mt-0.5">{section.purpose}</p>
        {section.contentGuidance && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {section.contentGuidance}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// =============================================================================
// WIREFRAME PREVIEW
// =============================================================================

function WireframePreview({ sections }: { sections: LayoutSection[] }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-1">
      {sections.map((section) => (
        <div
          key={section.order}
          className={cn(
            'rounded px-2 py-1 text-[10px] text-muted-foreground/70 bg-muted/40 border border-border/20 truncate',
            section.order === 1 && 'bg-primary/5 border-primary/10 text-primary/60 py-2'
          )}
        >
          {section.sectionName}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function LayoutEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Layers className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Layout preview will appear here</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Section-by-section breakdown with purpose and content guidance
      </p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPreview({ sections, className }: LayoutPreviewProps) {
  if (sections.length === 0) {
    return <LayoutEmpty />
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Page Layout</span>
          <Badge variant="secondary" className="text-xs">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'}
          </Badge>
        </div>
      </div>

      {/* Two-column: wireframe + details */}
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
        {/* Mini wireframe */}
        <div className="hidden sm:block">
          <WireframePreview sections={sortedSections} />
        </div>

        {/* Section list */}
        <div className="space-y-2">
          {sortedSections.map((section, index) => (
            <SectionRow key={section.order} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
