'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Layout, Layers, GripVertical, Lock, X, Plus, Pencil, Check } from 'lucide-react'
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
// SECTION WIREFRAME RENDERERS
// =============================================================================

function HeroBlock() {
  return (
    <div className="space-y-3 p-4">
      <NavBar />
      <ImagePlaceholder className="h-28 w-full" />
      <TextLines lines={2} widths={[80, 55]} size="lg" />
      <ButtonShape width="w-24" />
    </div>
  )
}

function FeaturesBlock() {
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

function TestimonialsBlock() {
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <QuoteGlyph className="text-3xl" />
      <TextLines lines={2} widths={[75, 55]} size="sm" className="w-3/4" />
      <CircleIcon size="sm" className="mt-1" />
    </div>
  )
}

function CtaBlock() {
  return (
    <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 border-y border-slate-300 dark:border-slate-600 py-5 px-4">
      <ButtonShape width="w-28" />
    </div>
  )
}

function FooterBlock() {
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

function PricingBlock() {
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden"
        >
          <div className="h-4 bg-slate-200 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600" />
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

function FaqBlock() {
  return (
    <div className="space-y-1.5 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ChevronBar key={i} />
      ))}
    </div>
  )
}

function GalleryBlock() {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <ImagePlaceholder key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function FallbackBlock({ sectionName }: { sectionName: string }) {
  return (
    <div className="relative p-4">
      <div className="h-16 w-full border rounded-sm border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <span className="text-[9px] text-slate-400 dark:text-slate-500">{sectionName}</span>
      </div>
    </div>
  )
}

// =============================================================================
// SECTION WIREFRAME DISPATCHER
// =============================================================================

function renderSectionWireframe(type: SectionType, sectionName: string) {
  switch (type) {
    case 'hero':
      return <HeroBlock />
    case 'features':
      return <FeaturesBlock />
    case 'testimonials':
      return <TestimonialsBlock />
    case 'cta':
      return <CtaBlock />
    case 'footer':
      return <FooterBlock />
    case 'pricing':
      return <PricingBlock />
    case 'faq':
      return <FaqBlock />
    case 'gallery':
      return <GalleryBlock />
    case 'fallback':
      return <FallbackBlock sectionName={sectionName} />
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
      {index > 0 && (
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
      )}

      {/* Wireframe content */}
      {renderSectionWireframe(type, section.sectionName)}
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
          className="text-[10px] font-semibold bg-white dark:bg-slate-800 border border-primary/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/30 w-28 text-foreground"
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
      <WireframeLabel>{name}</WireframeLabel>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover/label:text-muted-foreground/60 transition-colors" />
    </button>
  )
}

// =============================================================================
// ADD SECTION BUTTON (inline between sections)
// =============================================================================

function AddSectionDivider({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/add relative flex items-center justify-center h-5 -my-1 z-10">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/0 group-hover/add:border-slate-300 dark:group-hover/add:border-slate-600 transition-colors" />
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
// INTERACTIVE SECTION BLOCK
// =============================================================================

interface InteractiveSectionBlockProps {
  section: LayoutSection
  index: number
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
}

function InteractiveSectionBlock({
  section,
  index,
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
}: InteractiveSectionBlockProps) {
  const type = detectSectionType(section.sectionName)
  const tooltip = [section.purpose, section.contentGuidance].filter(Boolean).join(' — ')

  return (
    <div
      className={cn(
        'relative group/section transition-all duration-150',
        isDragging && 'opacity-30 scale-[0.98]',
        !pinned && 'cursor-grab active:cursor-grabbing',
        isDropTarget && 'bg-primary/[0.03]'
      )}
      title={tooltip}
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

      {/* Section toolbar: drag handle / lock + label + delete */}
      <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex items-center gap-1">
        {/* Left: drag handle or lock + editable label */}
        <div className="flex items-center gap-0.5 min-w-0">
          {pinned ? (
            <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          ) : (
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          )}
          <EditableSectionLabel name={section.sectionName} onRename={onRename} />
        </div>

        {/* Right: delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="ml-auto p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground/0 group-hover/section:text-muted-foreground/40 hover:!text-red-500 transition-colors shrink-0"
          title="Remove section"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Divider between sections */}
      {index > 0 && (
        <div className="border-t border-dashed border-slate-200 dark:border-slate-700" />
      )}

      {/* Wireframe content */}
      {renderSectionWireframe(type, section.sectionName)}

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

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Layout className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Page Layout</span>
        <Badge variant="secondary" className="text-xs">
          {displaySections.length} {displaySections.length === 1 ? 'section' : 'sections'}
        </Badge>
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
