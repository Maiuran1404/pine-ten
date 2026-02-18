'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type ChatStage, type MoodboardItem } from './types'
import { type LiveBrief, type VisualDirection } from './brief-panel/types'
import { isBriefReadyForDesigner } from './brief-panel/types'
import { BriefFieldsContent } from './brief-panel'
import { VisualDirectionPanel } from './brief-panel/visual-direction'
import { ContentOutlinePanel } from './brief-panel/content-outline'
import { MoodboardCard } from './moodboard/moodboard-card'
import { MoodboardSectionHeader } from './moodboard/moodboard-header'
import { ColorSwatches } from './moodboard/color-swatches'
import {
  BRIEFING_CHAT_STAGES,
  STAGE_DESCRIPTIONS,
  isStageCompleted,
  isCurrentStage,
} from '@/lib/chat-progress'
import { getStageHint } from '@/lib/chat-progress'

// =============================================================================
// TYPES
// =============================================================================

interface UnifiedPanelProps {
  currentStage: ChatStage
  completedStages: ChatStage[]
  progressPercentage: number
  brief: LiveBrief | null
  onBriefUpdate: (brief: LiveBrief) => void
  onExportBrief?: () => void
  briefCompletion: number
  moodboardItems: MoodboardItem[]
  onRemoveMoodboardItem: (id: string) => void
  onClearMoodboard?: () => void
  onRequestSubmit?: () => void
  isReadyForDesigner?: boolean
  deliverableCategory?: string | null
  className?: string
}

type SectionKey = 'brief' | 'moodboard' | 'visual' | 'outline'

interface SectionConfig {
  key: SectionKey
  label: string
  defaultOpen: boolean
  itemCount?: number
}

// =============================================================================
// STAGE-TO-SECTION MAPPING
// =============================================================================

function getSectionsForStage(
  currentStage: ChatStage,
  brief: LiveBrief | null,
  moodboardItems: MoodboardItem[],
  deliverableCategory?: string | null
): SectionConfig[] {
  const moodboardCount = moodboardItems.length
  const outlineCount = brief?.contentOutline?.totalItems || 0
  // Only show Content Plan for content/calendar deliverables or multi-asset plans
  const showOutline =
    !deliverableCategory ||
    deliverableCategory === 'content' ||
    brief?.taskType.value === 'multi_asset_plan'
  const visualCount =
    (brief?.visualDirection?.selectedStyles.length || 0) +
    (brief?.visualDirection?.colorPalette.length || 0) +
    (brief?.visualDirection?.moodKeywords.length || 0)

  let sections: SectionConfig[]

  switch (currentStage) {
    case 'brief':
      sections = [{ key: 'brief', label: 'Brief', defaultOpen: true }]
      break

    case 'style':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: false },
        { key: 'moodboard', label: 'Moodboard', defaultOpen: true, itemCount: moodboardCount },
      ]
      break

    case 'details':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: false },
        { key: 'moodboard', label: 'Moodboard', defaultOpen: false, itemCount: moodboardCount },
        {
          key: 'visual',
          label: 'Visual Direction',
          defaultOpen: true,
          itemCount: visualCount || undefined,
        },
      ]
      break

    case 'strategic_review':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: true },
        {
          key: 'visual',
          label: 'Visual Direction',
          defaultOpen: false,
          itemCount: visualCount || undefined,
        },
        ...(showOutline
          ? [
              {
                key: 'outline' as SectionKey,
                label: 'Content Plan',
                defaultOpen: true,
                itemCount: outlineCount || undefined,
              },
            ]
          : []),
        { key: 'moodboard', label: 'Moodboard', defaultOpen: false, itemCount: moodboardCount },
      ]
      break

    case 'moodboard':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: false },
        { key: 'moodboard', label: 'Moodboard', defaultOpen: true, itemCount: moodboardCount },
        {
          key: 'visual',
          label: 'Visual Direction',
          defaultOpen: true,
          itemCount: visualCount || undefined,
        },
        ...(showOutline
          ? [
              {
                key: 'outline' as SectionKey,
                label: 'Content Plan',
                defaultOpen: false,
                itemCount: outlineCount || undefined,
              },
            ]
          : []),
      ]
      break

    case 'review':
    case 'deepen':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: true },
        {
          key: 'visual',
          label: 'Visual Direction',
          defaultOpen: false,
          itemCount: visualCount || undefined,
        },
        ...(showOutline
          ? [
              {
                key: 'outline' as SectionKey,
                label: 'Content Plan',
                defaultOpen: true,
                itemCount: outlineCount || undefined,
              },
            ]
          : []),
        { key: 'moodboard', label: 'Moodboard', defaultOpen: false, itemCount: moodboardCount },
      ]
      break

    case 'submit':
      sections = [
        { key: 'brief', label: 'Brief', defaultOpen: true },
        {
          key: 'visual',
          label: 'Visual Direction',
          defaultOpen: true,
          itemCount: visualCount || undefined,
        },
        ...(showOutline
          ? [
              {
                key: 'outline' as SectionKey,
                label: 'Content Plan',
                defaultOpen: false,
                itemCount: outlineCount || undefined,
              },
            ]
          : []),
        { key: 'moodboard', label: 'Moodboard', defaultOpen: false, itemCount: moodboardCount },
      ]
      break

    default:
      sections = [{ key: 'brief', label: 'Brief', defaultOpen: true }]
      break
  }

  return sections
}

// =============================================================================
// NEXT ACTION BAR TEXT
// =============================================================================

function getNextActionText(currentStage: ChatStage, isReady: boolean): string {
  if (isReady) return '' // Button shown instead
  return getStageHint(currentStage)
}

// =============================================================================
// CONTEXT STRIP
// =============================================================================

function ContextStrip({
  currentStage,
  completedStages,
}: {
  currentStage: ChatStage
  completedStages: ChatStage[]
}) {
  const currentIndex = BRIEFING_CHAT_STAGES.indexOf(currentStage)
  const progressPercent = Math.round((currentIndex / (BRIEFING_CHAT_STAGES.length - 1)) * 100)

  return (
    <div className="shrink-0 px-4 py-2.5 border-b border-border/30">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
          {STAGE_DESCRIPTIONS[currentStage]}
        </span>
        <div className="flex items-center gap-1.5">
          {BRIEFING_CHAT_STAGES.map((stage) => {
            const isCompleted = isStageCompleted(stage, completedStages)
            const isCurrent = isCurrentStage(stage, currentStage)

            return (
              <div
                key={stage}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  isCompleted && 'bg-emerald-500',
                  isCurrent && !isCompleted && 'bg-emerald-500/50',
                  !isCompleted && !isCurrent && 'bg-muted-foreground/20'
                )}
                title={STAGE_DESCRIPTIONS[stage]}
              />
            )
          })}
        </div>
      </div>
      {/* Thin progress bar */}
      <div className="mt-1.5 h-0.5 w-full rounded-full bg-muted-foreground/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// COLLAPSIBLE SECTION
// =============================================================================

function CollapsibleSection({
  label,
  isOpen,
  onToggle,
  itemCount,
  children,
}: {
  label: string
  isOpen: boolean
  onToggle: () => void
  itemCount?: number
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          )}
          <span className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">
            {label}
          </span>
          {itemCount !== undefined && itemCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
              {itemCount}
            </span>
          )}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// INLINE MOODBOARD CONTENT (no ScrollArea wrapper)
// =============================================================================

function MoodboardContent({
  items,
  onRemoveItem,
}: {
  items: MoodboardItem[]
  onRemoveItem: (id: string) => void
}) {
  const groupedItems = useMemo(() => {
    const styles = items.filter((item) => item.type === 'style')
    const uploads = items.filter((item) => item.type === 'upload')
    const colors = items.filter((item) => item.type === 'color')
    return { styles, uploads, colors }
  }, [items])

  if (items.length === 0) {
    return (
      <div className="px-4 pb-4 text-center py-4">
        <p className="text-xs text-muted-foreground/50">
          Styles will appear here as you select them
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Styles are shown in Visual Direction — not duplicated here */}

      {groupedItems.colors.length > 0 && (
        <div>
          <MoodboardSectionHeader title="Colors" itemCount={groupedItems.colors.length} />
          <div className="pt-1">
            <ColorSwatches
              colors={groupedItems.colors.map((item) => ({
                id: item.id,
                color: item.metadata?.colorSamples?.[0] || '#888',
                name: item.name,
              }))}
              onRemove={onRemoveItem}
            />
          </div>
        </div>
      )}

      {groupedItems.uploads.length > 0 && (
        <div>
          <MoodboardSectionHeader title="Uploads" itemCount={groupedItems.uploads.length} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            {groupedItems.uploads.map((item) => (
              <MoodboardCard key={item.id} item={item} onRemove={onRemoveItem} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN UNIFIED PANEL
// =============================================================================

export function UnifiedPanel({
  currentStage,
  completedStages,
  brief,
  onBriefUpdate,
  briefCompletion: _briefCompletion,
  moodboardItems,
  onRemoveMoodboardItem,
  onRequestSubmit,
  isReadyForDesigner,
  deliverableCategory,
  className,
}: UnifiedPanelProps) {
  // Track user-toggled open/close state per section
  const [userToggles, setUserToggles] = useState<Record<SectionKey, boolean | undefined>>({
    brief: undefined,
    moodboard: undefined,
    visual: undefined,
    outline: undefined,
  })

  // Track which sections have appeared before (for first-appearance defaultOpen)
  const [seenSections, setSeenSections] = useState<Set<SectionKey>>(new Set(['brief']))

  const sections = useMemo(
    () => getSectionsForStage(currentStage, brief, moodboardItems, deliverableCategory),
    [currentStage, brief, moodboardItems, deliverableCategory]
  )

  // Update seen sections when new ones appear
  const currentSectionKeys = useMemo(() => sections.map((s) => s.key), [sections])
  useMemo(() => {
    const newSeen = new Set(seenSections)
    let changed = false
    for (const key of currentSectionKeys) {
      if (!newSeen.has(key)) {
        newSeen.add(key)
        changed = true
      }
    }
    if (changed) setSeenSections(newSeen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionKeys])

  const isSectionOpen = useCallback(
    (section: SectionConfig): boolean => {
      const userToggle = userToggles[section.key]
      if (userToggle !== undefined) return userToggle
      return section.defaultOpen
    },
    [userToggles]
  )

  const toggleSection = useCallback((key: SectionKey) => {
    setUserToggles((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }))
  }, [])

  // Visual direction update handler
  const handleVisualDirectionUpdate = useCallback(
    (vd: VisualDirection) => {
      if (brief && onBriefUpdate) {
        onBriefUpdate({ ...brief, visualDirection: vd, updatedAt: new Date() })
      }
    },
    [brief, onBriefUpdate]
  )

  // Content outline update handler
  const handleOutlineUpdate = useCallback(
    (outline: LiveBrief['contentOutline']) => {
      if (brief && onBriefUpdate) {
        onBriefUpdate({ ...brief, contentOutline: outline, updatedAt: new Date() })
      }
    },
    [brief, onBriefUpdate]
  )

  const isReady = isReadyForDesigner ?? (brief ? isBriefReadyForDesigner(brief) : false)
  const nextActionText = getNextActionText(currentStage, isReady)

  // Section renderer
  const renderSection = (section: SectionConfig) => {
    switch (section.key) {
      case 'brief':
        if (!brief || !onBriefUpdate) {
          return (
            <div className="px-4 pb-4 text-center py-4">
              <p className="text-xs text-muted-foreground/50">Brief builds as you chat</p>
            </div>
          )
        }
        return <BriefFieldsContent brief={brief} onBriefUpdate={onBriefUpdate} />

      case 'moodboard':
        return <MoodboardContent items={moodboardItems} onRemoveItem={onRemoveMoodboardItem} />

      case 'visual':
        return (
          <div className="px-4 pb-4">
            <VisualDirectionPanel
              visualDirection={brief?.visualDirection || null}
              onUpdate={handleVisualDirectionUpdate}
            />
          </div>
        )

      case 'outline':
        return (
          <div className="px-4 pb-4">
            <ContentOutlinePanel
              outline={brief?.contentOutline || null}
              taskType={brief?.taskType.value || null}
              onOutlineUpdate={handleOutlineUpdate}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-transparent', className)}>
      {/* Context Strip */}
      <ContextStrip currentStage={currentStage} completedStages={completedStages} />

      {/* Primary Content - Scrollable */}
      <ScrollArea className="flex-1">
        <div>
          {sections.map((section) => (
            <CollapsibleSection
              key={section.key}
              label={section.label}
              isOpen={isSectionOpen(section)}
              onToggle={() => toggleSection(section.key)}
              itemCount={section.itemCount}
            >
              {renderSection(section)}
            </CollapsibleSection>
          ))}
        </div>
      </ScrollArea>

      {/* Next Action Bar */}
      <div className="shrink-0 px-4 py-3 border-t border-border/30">
        {isReady && onRequestSubmit ? (
          <Button size="sm" className="w-full gap-2" onClick={onRequestSubmit}>
            <Send className="h-3.5 w-3.5" />
            Submit for design
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 text-center">{nextActionText}</p>
        )}
      </div>
    </div>
  )
}
