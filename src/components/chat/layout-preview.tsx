'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layout,
  Layers,
  GripVertical,
  Lock,
  X,
  Plus,
  Pencil,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  BrowserChrome,
  WireframeLabel,
  ImagePlaceholder,
  TextLines,
  ButtonShape,
  CircleIcon,
  NavBar,
  BlockRect,
  CheckRow,
  ChevronBar,
  QuoteGlyph,
} from '@/components/chat/wireframe'
import type { LayoutSection } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface LayoutPreviewProps {
  sections: LayoutSection[]
  mode?: 'readonly' | 'interactive'
  onSectionReorder?: (sections: LayoutSection[]) => void
  onSectionEdit?: (sectionIndex: number, field: string, value: string) => void
  onGenerateSectionContent?: (sectionIndex: number) => void
  className?: string
}

// =============================================================================
// SECTION KEYWORD MATCHING
// =============================================================================

type SectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'pricing'
  | 'faq'
  | 'gallery'
  | 'fallback'

function detectSectionType(sectionName: string): SectionType {
  const name = sectionName.toLowerCase()

  if (/hero|header/.test(name)) return 'hero'
  if (/features?|benefits?/.test(name)) return 'features'
  if (/social\s*proof|testimonials?/.test(name)) return 'testimonials'
  if (/cta|call[\s-]*to[\s-]*action/.test(name)) return 'cta'
  if (/footer/.test(name)) return 'footer'
  if (/pricing/.test(name)) return 'pricing'
  if (/faq/.test(name)) return 'faq'
  if (/gallery|portfolio/.test(name)) return 'gallery'

  return 'fallback'
}

/** Whether a section type is pinned (not draggable) */
function isPinnedSection(sectionName: string): boolean {
  const type = detectSectionType(sectionName)
  return type === 'hero' || type === 'footer'
}

// =============================================================================
// FRIENDLY NAME MAPPING
// =============================================================================

function getFriendlyName(sectionName: string): string {
  const type = detectSectionType(sectionName)
  switch (type) {
    case 'hero':
      return 'First Impression'
    case 'testimonials':
      return 'Happy Customers'
    case 'cta':
      return 'Next Step'
    case 'footer':
      return 'Page Footer'
    case 'faq':
      return 'Common Questions'
    case 'features':
      return 'Why Choose You'
    case 'pricing':
      return 'Pricing'
    case 'gallery':
      return 'Gallery'
    case 'fallback':
      return sectionName
  }
}

// =============================================================================
// NOTE PLACEHOLDER MAPPING
// =============================================================================

function getNotePlaceholder(sectionType: SectionType): string {
  switch (sectionType) {
    case 'hero':
      return 'What photo or message should grab attention?'
    case 'features':
      return 'What are your top selling points?'
    case 'testimonials':
      return 'Any favorite reviews or customer quotes?'
    case 'cta':
      return 'What should visitors do next?'
    case 'faq':
      return 'What do people always ask you?'
    case 'gallery':
      return 'What images or work should be showcased?'
    case 'pricing':
      return 'What plans or packages do you offer?'
    default:
      return 'Any thoughts or ideas for this section?'
  }
}

// =============================================================================
// SECTION WIREFRAME RENDERERS (compact for interactive mode)
// =============================================================================

function HeroBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-1.5 p-2">
        <NavBar />
        <ImagePlaceholder className="h-10 w-full" />
        <TextLines lines={1} widths={[70]} size="sm" />
        <ButtonShape width="w-14" />
      </div>
    )
  }
  return (
    <div className="space-y-3 p-4">
      <NavBar />
      <ImagePlaceholder className="h-28 w-full" />
      <TextLines lines={2} widths={[80, 55]} size="lg" />
      <ButtonShape width="w-24" />
    </div>
  )
}

function FeaturesBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1.5 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <CircleIcon size="sm" />
            <TextLines lines={2} widths={[90, 60]} size="sm" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <CircleIcon size="lg" />
          <TextLines lines={3} widths={[90, 70, 50]} size="sm" />
        </div>
      ))}
    </div>
  )
}

function TestimonialsBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 p-2">
        <QuoteGlyph className="text-lg" />
        <TextLines lines={1} widths={[70]} size="sm" className="w-3/4" />
        <CircleIcon size="sm" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <QuoteGlyph className="text-3xl" />
      <TextLines lines={2} widths={[75, 55]} size="sm" className="w-3/4" />
      <CircleIcon size="sm" className="mt-1" />
    </div>
  )
}

function CtaBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center bg-muted border-y border-border py-2 px-2">
        <ButtonShape width="w-16" />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center bg-muted border-y border-border py-5 px-4">
      <ButtonShape width="w-28" />
    </div>
  )
}

function FooterBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-2 py-1.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <BlockRect key={i} className="w-3 h-3" />
            ))}
          </div>
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <TextLines key={i} lines={2} widths={[100, 80]} size="sm" className="w-8" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <BlockRect key={i} className="w-4 h-4" />
          ))}
        </div>
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <TextLines key={i} lines={3} widths={[100, 80, 60]} size="sm" className="w-12" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PricingBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-sm overflow-hidden">
            <div className="h-2 bg-muted border-b border-border" />
            <div className="p-1 space-y-0.5">
              <CheckRow />
              <CheckRow />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border rounded-sm overflow-hidden">
          <div className="h-4 bg-muted border-b border-border" />
          <div className="p-2 space-y-1.5">
            <CheckRow />
            <CheckRow />
            <CheckRow />
          </div>
        </div>
      ))}
    </div>
  )
}

function FaqBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3].map((i) => (
          <ChevronBar key={i} />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-1.5 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ChevronBar key={i} />
      ))}
    </div>
  )
}

function GalleryBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-1 p-2">
        {[1, 2, 3, 4].map((i) => (
          <ImagePlaceholder key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ImagePlaceholder key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function FallbackBlock({ sectionName, compact }: { sectionName: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative p-2">
        <div className="h-8 w-full border rounded-sm border-border bg-muted flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">{sectionName}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="relative p-4">
      <div className="h-16 w-full border rounded-sm border-border bg-muted flex items-center justify-center">
        <span className="text-[9px] text-muted-foreground">{sectionName}</span>
      </div>
    </div>
  )
}

// =============================================================================
// SECTION WIREFRAME DISPATCHER
// =============================================================================

function renderSectionWireframe(type: SectionType, sectionName: string, compact?: boolean) {
  switch (type) {
    case 'hero':
      return <HeroBlock compact={compact} />
    case 'features':
      return <FeaturesBlock compact={compact} />
    case 'testimonials':
      return <TestimonialsBlock compact={compact} />
    case 'cta':
      return <CtaBlock compact={compact} />
    case 'footer':
      return <FooterBlock compact={compact} />
    case 'pricing':
      return <PricingBlock compact={compact} />
    case 'faq':
      return <FaqBlock compact={compact} />
    case 'gallery':
      return <GalleryBlock compact={compact} />
    case 'fallback':
      return <FallbackBlock sectionName={sectionName} compact={compact} />
  }
}

// =============================================================================
// SECTION BLOCK (readonly)
// =============================================================================

function SectionBlock({ section, index }: { section: LayoutSection; index: number }) {
  const type = detectSectionType(section.sectionName)
  const tooltip = [section.purpose, section.contentGuidance].filter(Boolean).join(' — ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="relative"
      title={tooltip}
    >
      {/* Label */}
      <div className="absolute top-1.5 left-1.5 z-10">
        <WireframeLabel>{section.sectionName}</WireframeLabel>
      </div>

      {/* Divider between sections */}
      {index > 0 && <div className="border-t border-dashed border-border/50" />}

      {/* Wireframe content */}
      {renderSectionWireframe(type, section.sectionName)}

      {/* Elaboration content preview */}
      {(section.headline || section.draftContent || section.ctaText) && (
        <div className="px-4 pb-2 space-y-1 border-t border-dashed border-border/50 mt-1 pt-2">
          {section.headline && (
            <p className="text-[11px] font-semibold text-foreground truncate">{section.headline}</p>
          )}
          {section.draftContent && (
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
              {section.draftContent}
            </p>
          )}
          {section.ctaText && (
            <span className="inline-block text-[9px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              {section.ctaText}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// EDITABLE SECTION LABEL
// =============================================================================

function EditableSectionLabel({
  name,
  onRename,
}: {
  name: string
  onRename: (newName: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      onRename(trimmed)
    } else {
      setEditValue(name)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-0.5">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setEditValue(name)
              setIsEditing(false)
            }
          }}
          className="text-xs font-semibold bg-white dark:bg-secondary border border-primary/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/30 w-32 text-foreground"
        />
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            commit()
          }}
          className="p-0.5 rounded hover:bg-primary/10 text-primary"
        >
          <Check className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setEditValue(name)
        setIsEditing(true)
      }}
      className="group/label flex items-center gap-1 cursor-text"
    >
      <span className="text-xs font-semibold text-foreground">{name}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover/label:text-muted-foreground/60 transition-colors" />
    </button>
  )
}

// =============================================================================
// SECTION NOTE INPUT (ghost textarea)
// =============================================================================

function SectionNoteInput({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (value: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [showSaved, setShowSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    resize()
  }, [localValue, resize])

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue)
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 1500)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'w-full resize-none bg-transparent text-xs leading-relaxed',
          'placeholder:text-muted-foreground/40 text-foreground',
          'border border-transparent rounded-md px-2.5 py-2',
          'hover:border-border/40 focus:border-primary/30 focus:bg-muted/30',
          'outline-none transition-colors',
          'overflow-hidden'
        )}
      />
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-2 top-2 flex items-center gap-0.5 text-ds-success"
          >
            <Check className="h-3 w-3" />
            <span className="text-[10px] font-medium">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// ADD SECTION BUTTON (inline between sections)
// =============================================================================

function AddSectionDivider({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/add relative flex items-center justify-center h-5 -my-1 z-10">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-transparent group-hover/add:border-border transition-colors" />
      <button
        onClick={onClick}
        className="relative flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
          text-muted-foreground/0 group-hover/add:text-muted-foreground/70
          bg-transparent group-hover/add:bg-background
          border border-transparent group-hover/add:border-border/60
          hover:!text-primary hover:!border-primary/30 hover:!bg-primary/5
          transition-all cursor-pointer"
      >
        <Plus className="h-3 w-3" />
        <span>Add section</span>
      </button>
    </div>
  )
}

// =============================================================================
// SECTION FIDELITY DOTS
// =============================================================================

function SectionFidelityDots({ section }: { section: LayoutSection }) {
  const hasHeadline = !!section.headline
  const hasDraftContent = !!section.draftContent
  const hasCtaText = !!section.ctaText

  return (
    <div className="flex items-center gap-0.5" title="Content completeness">
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          hasHeadline ? 'bg-crafted-green' : 'bg-muted-foreground/20'
        )}
      />
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          hasDraftContent ? 'bg-crafted-green' : 'bg-muted-foreground/20'
        )}
      />
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          hasCtaText ? 'bg-crafted-green' : 'bg-muted-foreground/20'
        )}
      />
    </div>
  )
}

// =============================================================================
// INLINE EDIT FIELD (ghost input for click-to-edit)
// =============================================================================

function InlineEditField({
  value,
  placeholder,
  onSave,
  multiline,
}: {
  value: string
  placeholder: string
  onSave: (value: string) => void
  multiline?: boolean
}) {
  const [localValue, setLocalValue] = useState(value)

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue)
    }
  }

  const sharedClassName = cn(
    'w-full resize-none bg-transparent text-xs leading-relaxed',
    'placeholder:text-muted-foreground/40 text-foreground',
    'border border-transparent rounded-md px-2.5 py-1.5',
    'hover:border-border/40 focus:border-primary/30 focus:bg-muted/30',
    'outline-none transition-colors'
  )

  if (multiline) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={2}
        className={cn(sharedClassName, 'overflow-hidden')}
      />
    )
  }

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={sharedClassName}
    />
  )
}

// =============================================================================
// INTERACTIVE SECTION BLOCK (redesigned)
// =============================================================================

interface InteractiveSectionBlockProps {
  section: LayoutSection
  index: number
  displayIndex: number
  totalSections: number
  pinned: boolean
  isDragging: boolean
  isDropTarget: boolean
  dropPosition: 'above' | 'below' | null
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onRename: (newName: string) => void
  onDelete: () => void
  onNoteChange?: (value: string) => void
  onFieldEdit?: (field: string, value: string) => void
  onGenerateContent?: () => void
}

function InteractiveSectionBlock({
  section,
  index,
  displayIndex,
  totalSections: _totalSections,
  pinned,
  isDragging,
  isDropTarget,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRename,
  onDelete,
  onNoteChange,
  onFieldEdit,
  onGenerateContent,
}: InteractiveSectionBlockProps) {
  const type = detectSectionType(section.sectionName)
  const friendlyName = getFriendlyName(section.sectionName)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const hasElaboration = !!(section.headline || section.draftContent || section.ctaText)

  return (
    <div
      className={cn(
        'relative group/section transition-all duration-150',
        isDragging && 'opacity-30 scale-[0.98]',
        isDropTarget && 'bg-primary/[0.03]'
      )}
      draggable={!pinned}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drop indicator line — above */}
      {isDropTarget && dropPosition === 'above' && (
        <div className="absolute -top-px left-0 right-0 z-20 flex items-center">
          <div className="w-2 h-2 rounded-full bg-primary -ml-1" />
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="w-2 h-2 rounded-full bg-primary -mr-1" />
        </div>
      )}

      {/* Divider between sections */}
      {index > 0 && <div className="border-t border-border/40" />}

      {/* Section Header */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        {/* Drag handle or lock */}
        <div className={cn('shrink-0', !pinned && 'cursor-grab active:cursor-grabbing')}>
          {pinned ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
          ) : (
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
          )}
        </div>

        {/* Section number + friendly name */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground/50 shrink-0">
            {displayIndex + 1}.
          </span>
          <EditableSectionLabel name={friendlyName} onRename={onRename} />
        </div>

        {/* Fidelity dots + actions */}
        <div className="flex items-center gap-1 shrink-0">
          <SectionFidelityDots section={section} />
          {onGenerateContent && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onGenerateContent()
              }}
              className="p-1 rounded hover:bg-primary/10 text-muted-foreground/0 group-hover/section:text-muted-foreground/40 hover:!text-primary transition-colors"
              title="Generate copy"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/0 group-hover/section:text-muted-foreground/40 hover:!text-destructive transition-colors"
            title="Remove section"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground/40 transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                isCollapsed && '-rotate-90'
              )}
            />
          </button>
        </div>
      </div>

      {/* Purpose line (always visible) */}
      {section.purpose && (
        <div className="px-3 pb-2 -mt-1">
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-6">
            {section.purpose}
          </p>
        </div>
      )}

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              {/* Wireframe thumbnail (compact) */}
              <div className="rounded-lg bg-muted/30 border border-border/30 overflow-hidden">
                {renderSectionWireframe(type, section.sectionName, true)}
              </div>

              {/* Inline edit fields (click-to-edit) */}
              {onFieldEdit && (
                <div className="space-y-1.5">
                  <InlineEditField
                    value={section.headline ?? ''}
                    placeholder="Headline"
                    onSave={(v) => onFieldEdit('headline', v)}
                  />
                  <InlineEditField
                    value={section.draftContent ?? ''}
                    placeholder="Body / draft content"
                    onSave={(v) => onFieldEdit('draftContent', v)}
                    multiline
                  />
                  <InlineEditField
                    value={section.ctaText ?? ''}
                    placeholder="CTA text"
                    onSave={(v) => onFieldEdit('ctaText', v)}
                  />
                </div>
              )}

              {/* User notes textarea */}
              {onNoteChange && (
                <SectionNoteInput
                  value={section.userNotes ?? ''}
                  placeholder={getNotePlaceholder(type)}
                  onSave={onNoteChange}
                />
              )}

              {/* AI Draft preview (elaboration content) — shown only when inline edit is not active */}
              {!onFieldEdit && hasElaboration && (
                <div className="rounded-md border border-border/30 bg-muted/20 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3 text-primary/50" />
                    <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      AI Draft
                    </span>
                  </div>
                  {section.headline && (
                    <p className="text-[11px] font-semibold text-foreground truncate">
                      {section.headline}
                    </p>
                  )}
                  {section.draftContent && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {section.draftContent}
                    </p>
                  )}
                  {section.ctaText && (
                    <span className="inline-block text-[9px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {section.ctaText}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop indicator line — below */}
      {isDropTarget && dropPosition === 'below' && (
        <div className="absolute -bottom-px left-0 right-0 z-20 flex items-center">
          <div className="w-2 h-2 rounded-full bg-primary -ml-1" />
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="w-2 h-2 rounded-full bg-primary -mr-1" />
        </div>
      )}
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
// HELPERS
// =============================================================================

/** Reassign sequential order values to a sections array */
function reindex(sections: LayoutSection[]): LayoutSection[] {
  return sections.map((s, i) => ({ ...s, order: i }))
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPreview({
  sections,
  mode = 'readonly',
  onSectionReorder,
  onSectionEdit,
  onGenerateSectionContent,
  className,
}: LayoutPreviewProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null)

  if (sections.length === 0 && mode === 'readonly') {
    return <LayoutEmpty />
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  // ---- Readonly mode ----
  if (mode === 'readonly') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Page Layout</span>
          <Badge variant="secondary" className="text-xs">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'}
          </Badge>
        </div>
        <BrowserChrome>
          {sortedSections.map((section, index) => (
            <SectionBlock key={section.order} section={section} index={index} />
          ))}
        </BrowserChrome>
      </div>
    )
  }

  // ---- Interactive mode ----
  const emit = (next: LayoutSection[]) => onSectionReorder?.(reindex(next))

  // Split into pinned hero (top), draggable middle, pinned footer (bottom)
  const heroSections: LayoutSection[] = []
  const draggableSections: LayoutSection[] = []
  const footerSections: LayoutSection[] = []

  for (const section of sortedSections) {
    const type = detectSectionType(section.sectionName)
    if (type === 'hero') heroSections.push(section)
    else if (type === 'footer') footerSections.push(section)
    else draggableSections.push(section)
  }

  const displaySections = [...heroSections, ...draggableSections, ...footerSections]
  const heroCount = heroSections.length

  // -- Mutation helpers --
  const handleRename = (displayIndex: number, newName: string) => {
    const updated = displaySections.map((s, i) =>
      i === displayIndex ? { ...s, sectionName: newName } : s
    )
    emit(updated)
  }

  const handleDelete = (displayIndex: number) => {
    const updated = displaySections.filter((_, i) => i !== displayIndex)
    emit(updated)
  }

  const handleAddAfter = (displayIndex: number) => {
    const newSection: LayoutSection = {
      sectionName: 'New Section',
      purpose: '',
      contentGuidance: '',
      order: 0, // will be reindexed by emit
    }
    const updated = [...displaySections]
    updated.splice(displayIndex + 1, 0, newSection)
    emit(updated)
  }

  // -- Drag and drop --
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isPinnedSection(displaySections[index].sectionName)) {
      e.preventDefault()
      return
    }
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null) return

    if (isPinnedSection(displaySections[index].sectionName)) {
      setDropTargetIndex(null)
      setDropPosition(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const pos = e.clientY < midY ? 'above' : 'below'

    setDropTargetIndex(index)
    setDropPosition(pos)
  }

  const handleDragLeave = () => {
    setDropTargetIndex(null)
    setDropPosition(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex === null || dropTargetIndex === null || !onSectionReorder) {
      resetDragState()
      return
    }

    const draggedSection = displaySections[dragIndex]
    const newDraggable = [...draggableSections]
    const dragLocalIndex = dragIndex - heroCount
    const dropLocalIndex = dropTargetIndex - heroCount

    newDraggable.splice(dragLocalIndex, 1)

    let insertIndex = dropLocalIndex
    if (dropPosition === 'below') insertIndex += 1
    if (dragLocalIndex < dropLocalIndex) insertIndex -= 1
    insertIndex = Math.max(0, Math.min(newDraggable.length, insertIndex))

    newDraggable.splice(insertIndex, 0, draggedSection)

    emit([...heroSections, ...newDraggable, ...footerSections])
    resetDragState()
  }

  const handleDragEnd = () => resetDragState()

  const resetDragState = () => {
    setDragIndex(null)
    setDropTargetIndex(null)
    setDropPosition(null)
  }

  // Find the original sorted index for onSectionEdit callback
  const findSortedIndex = (displayIndex: number): number => {
    const section = displaySections[displayIndex]
    return sortedSections.findIndex((s) => s === section)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Layout className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Website</span>
          <Badge variant="secondary" className="text-xs">
            {displaySections.length} {displaySections.length === 1 ? 'section' : 'sections'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground/50 pl-6">
          Drag to reorder &middot; Click to add notes
        </p>
      </div>
      <BrowserChrome>
        {displaySections.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground/60">No sections yet</p>
            <button
              onClick={() =>
                emit([{ sectionName: 'New Section', purpose: '', contentGuidance: '', order: 0 }])
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add first section
            </button>
          </div>
        ) : (
          displaySections.map((section, index) => {
            const pinned = isPinnedSection(section.sectionName)
            return (
              <div key={`${section.sectionName}-${index}`}>
                <InteractiveSectionBlock
                  section={section}
                  index={index}
                  displayIndex={index}
                  totalSections={displaySections.length}
                  pinned={pinned}
                  isDragging={dragIndex === index}
                  isDropTarget={dropTargetIndex === index && !pinned}
                  dropPosition={dropTargetIndex === index ? dropPosition : null}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onRename={(newName) => handleRename(index, newName)}
                  onDelete={() => handleDelete(index)}
                  onNoteChange={
                    onSectionEdit
                      ? (value) => onSectionEdit(findSortedIndex(index), 'userNotes', value)
                      : undefined
                  }
                  onFieldEdit={
                    onSectionEdit
                      ? (field, value) => onSectionEdit(findSortedIndex(index), field, value)
                      : undefined
                  }
                  onGenerateContent={
                    onGenerateSectionContent
                      ? () => onGenerateSectionContent(findSortedIndex(index))
                      : undefined
                  }
                />
                {/* Add-section divider between items */}
                {index < displaySections.length - 1 && (
                  <AddSectionDivider onClick={() => handleAddAfter(index)} />
                )}
              </div>
            )
          })
        )}
      </BrowserChrome>

      {/* Add section at the bottom */}
      {displaySections.length > 0 && (
        <button
          onClick={() => handleAddAfter(displaySections.length - 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium w-full justify-center
            text-muted-foreground/60 hover:text-primary
            bg-transparent hover:bg-primary/5
            border border-dashed border-border/40 hover:border-primary/30
            transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </button>
      )}
    </div>
  )
}
