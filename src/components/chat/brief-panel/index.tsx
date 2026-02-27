'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle, ChevronRight, Copy, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LiveBrief, FieldSource } from './types'
import {
  PLATFORM_DISPLAY_NAMES,
  INTENT_DESCRIPTIONS,
  calculateBriefCompletion,
  isBriefReadyForDesigner,
} from './types'

// =============================================================================
// INTENT SHORT LABELS - Compact labels for chip display
// =============================================================================

const INTENT_SHORT_LABELS: Record<string, string> = {
  signups: 'Signups',
  authority: 'Authority',
  awareness: 'Awareness',
  sales: 'Sales',
  engagement: 'Engagement',
  education: 'Education',
  announcement: 'Announcement',
}

// =============================================================================
// SLEEK FIELD ROW - Legacy export, kept for backward compatibility
// =============================================================================

export interface SleekFieldProps {
  label: string
  value: string | null
  source: FieldSource
  confidence?: number
  suggestion?: string | null
  onUseSuggestion?: () => void
}

/** @deprecated Use TextBlock or MetadataChips instead */
export function SleekField({
  label,
  value,
  source,
  confidence = 0,
  suggestion,
  onUseSuggestion,
}: SleekFieldProps) {
  const hasValue = value && value.trim().length > 0

  const getStatusBadge = () => {
    if (source === 'confirmed') {
      return (
        <div className="flex items-center gap-1">
          <Check className="h-3 w-3 text-ds-success" />
        </div>
      )
    }
    if (source === 'inferred') {
      if (confidence >= 0.75) {
        return (
          <div className="flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-ds-success" />
            <span className="text-[9px] text-ds-success">Ready</span>
          </div>
        )
      }
      return (
        <div className="flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-ds-warning" />
          <span className="text-[9px] text-ds-warning">AI</span>
        </div>
      )
    }
    if (source === 'pending' && hasValue) {
      return (
        <div className="flex items-center gap-1">
          <Circle className="h-2.5 w-2.5 text-ds-info animate-pulse" />
          <span className="text-[9px] text-ds-info">Analyzing</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className="py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </span>
        {hasValue && getStatusBadge()}
      </div>
      {hasValue ? (
        <p
          className={cn(
            'text-sm leading-snug',
            source === 'pending' ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {value}
          {source === 'pending' && confidence > 0 && confidence < 0.5 && (
            <span className="text-[10px] text-muted-foreground/50 ml-1.5 italic">
              (refining...)
            </span>
          )}
        </p>
      ) : suggestion ? (
        <button
          onClick={onUseSuggestion}
          className="group flex items-center gap-1.5 text-sm text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <span className="italic">{suggestion}</span>
          <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-ds-success">
            click to use
          </span>
        </button>
      ) : (
        <span className="text-sm text-muted-foreground/30 italic">Mention in chat...</span>
      )}
    </div>
  )
}

// =============================================================================
// TEXT BLOCK - For long-form fields (Summary, Topic)
// =============================================================================

interface TextBlockProps {
  label: string
  value: string | null
  source: FieldSource
  confidence: number
  placeholder: string
  prominent?: boolean
}

function TextBlock({
  label,
  value,
  source,
  confidence,
  placeholder,
  prominent = false,
}: TextBlockProps) {
  const hasValue = value && value.trim().length > 0
  const isAnalyzing = source === 'pending' && hasValue

  return (
    <div className={cn(prominent ? 'mb-4' : 'mb-3')}>
      <span className="text-[10px] font-medium text-muted-foreground/50 tracking-wide">
        {label}
      </span>
      {hasValue ? (
        <p
          className={cn(
            'mt-0.5 leading-relaxed',
            prominent ? 'text-[13px] text-foreground' : 'text-xs text-foreground/80',
            isAnalyzing && 'text-muted-foreground'
          )}
        >
          {value}
          {isAnalyzing && confidence > 0 && confidence < 0.5 && (
            <span className="text-[10px] text-muted-foreground/40 ml-1 italic">(refining...)</span>
          )}
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-muted-foreground/30 italic">{placeholder}</p>
      )}
    </div>
  )
}

// =============================================================================
// FIELD CHIP - Single metadata chip with subtle source indicator
// =============================================================================

interface FieldChipProps {
  label: string
  value: string | null
  source: FieldSource
  confidence: number
  suggestion?: string | null
  onUseSuggestion?: () => void
}

function FieldChip({
  label,
  value,
  source,
  confidence,
  suggestion,
  onUseSuggestion,
}: FieldChipProps) {
  const hasValue = value && value.trim().length > 0
  const isConfirmed = source === 'confirmed'
  const isReady = source === 'inferred' && confidence >= 0.75
  const isAnalyzing = source === 'pending' && hasValue

  if (!hasValue && suggestion && onUseSuggestion) {
    return (
      <button
        onClick={onUseSuggestion}
        className="group inline-flex items-center gap-1 rounded-full border border-dashed border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground/40 hover:border-border/60 hover:text-muted-foreground/60 transition-colors"
      >
        <span>{label}</span>
        <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50">
          +
        </span>
      </button>
    )
  }

  if (!hasValue) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-border/30 px-2.5 py-1 text-[11px] text-muted-foreground/30 italic">
        {label}
      </span>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-[11px] font-normal py-1 px-2.5 gap-1.5',
        isAnalyzing && 'opacity-60',
        (isConfirmed || isReady) && 'ring-1 ring-crafted-green/20'
      )}
    >
      {(isConfirmed || isReady) && (
        <span className="w-1 h-1 rounded-full bg-crafted-green shrink-0" />
      )}
      {isAnalyzing && <span className="w-1 h-1 rounded-full bg-ds-info animate-pulse shrink-0" />}
      {value}
    </Badge>
  )
}

// =============================================================================
// BRIEF FIELDS CONTENT - Redesigned with chip-based metadata layout
// =============================================================================

interface BriefFieldsContentProps {
  brief: LiveBrief
  onBriefUpdate: (brief: LiveBrief) => void
}

export function BriefFieldsContent({ brief, onBriefUpdate }: BriefFieldsContentProps) {
  const isReady = isBriefReadyForDesigner(brief)

  // Get display values
  const platformValue = brief.platform.value ? PLATFORM_DISPLAY_NAMES[brief.platform.value] : null
  const audienceRaw = brief.audience.value?.name || null
  const audienceValue = audienceRaw ? audienceRaw.replace(/\b\w/g, (c) => c.toUpperCase()) : null
  const intentValue = brief.intent.value
    ? INTENT_SHORT_LABELS[brief.intent.value] || INTENT_DESCRIPTIONS[brief.intent.value]
    : null

  // Handlers to apply suggestions
  const applySuggestion = useCallback(
    (field: keyof LiveBrief, value: unknown) => {
      onBriefUpdate({
        ...brief,
        [field]:
          typeof value === 'string'
            ? { value, confidence: 0.7, source: 'inferred' as const }
            : value,
        updatedAt: new Date(),
      })
    },
    [brief, onBriefUpdate]
  )

  return (
    <div className="px-4 pb-4 space-y-0">
      {/* Summary -- prominent, first thing the eye hits */}
      <TextBlock
        label="Summary"
        value={brief.taskSummary.value}
        source={brief.taskSummary.source}
        confidence={brief.taskSummary.confidence}
        placeholder="Describe your project..."
        prominent
      />

      {/* Metadata chip cluster -- Platform, Intent, Audience, Dimensions */}
      <div className="mb-4">
        <span className="text-[10px] font-medium text-muted-foreground/50 tracking-wide">
          Details
        </span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <FieldChip
            label="Platform"
            value={platformValue}
            source={brief.platform.source}
            confidence={brief.platform.confidence}
            suggestion={!brief.platform.value ? 'Platform' : null}
            onUseSuggestion={() =>
              applySuggestion('platform', {
                value: 'instagram',
                confidence: 0.5,
                source: 'inferred',
              })
            }
          />
          <FieldChip
            label="Intent"
            value={intentValue}
            source={brief.intent.source}
            confidence={brief.intent.confidence}
            suggestion={!brief.intent.value ? 'Intent' : null}
            onUseSuggestion={() =>
              applySuggestion('intent', {
                value: 'announcement',
                confidence: 0.5,
                source: 'inferred',
              })
            }
          />
          <FieldChip
            label="Audience"
            value={audienceValue}
            source={brief.audience.source}
            confidence={brief.audience.confidence}
          />

          {/* Dimension chips inline with metadata (deduplicated) */}
          {brief.dimensions
            .filter(
              (dim, idx, arr) =>
                arr.findIndex((d) => d.width === dim.width && d.height === dim.height) === idx
            )
            .slice(0, 3)
            .map((dim) => (
              <Badge
                key={`${dim.width}x${dim.height}`}
                variant="outline"
                className="text-[10px] font-normal py-0.5 px-2 text-muted-foreground/70"
              >
                {dim.width}&times;{dim.height}
              </Badge>
            ))}
          {brief.dimensions.filter(
            (dim, idx, arr) =>
              arr.findIndex((d) => d.width === dim.width && d.height === dim.height) === idx
          ).length > 3 && (
            <span className="inline-flex items-center text-[10px] text-muted-foreground/40 px-1">
              +
              {brief.dimensions.filter(
                (dim, idx, arr) =>
                  arr.findIndex((d) => d.width === dim.width && d.height === dim.height) === idx
              ).length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Topic -- secondary text block, only shows when there is content or space permits */}
      <TextBlock
        label="Topic"
        value={brief.topic.value}
        source={brief.topic.source}
        confidence={brief.topic.confidence}
        placeholder="Mention in chat..."
      />

      {/* Brand Colors -- compact swatch row */}
      {brief.visualDirection?.colorPalette && brief.visualDirection.colorPalette.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium text-muted-foreground/50 tracking-wide">
            Brand Colors
          </span>
          <div className="flex items-center gap-1.5 mt-1.5">
            {brief.visualDirection.colorPalette.slice(0, 6).map((color, idx) => (
              <div
                key={idx}
                className="w-5 h-5 rounded-full border border-border/30 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ready indicator -- single, quiet confirmation */}
      {isReady && (
        <div className="pt-3 mt-1">
          <div className="flex items-center gap-1.5 text-ds-success">
            <Check className="h-3 w-3" />
            <span className="text-[11px] font-medium">Ready to submit</span>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN BRIEF PANEL COMPONENT - Sleek version with brand suggestions
// =============================================================================

interface BriefPanelProps {
  brief: LiveBrief
  onBriefUpdate: (brief: LiveBrief) => void
  onExportBrief?: () => void
  className?: string
  isExpanded?: boolean
  onToggleExpanded?: () => void
}

export function BriefPanel({
  brief,
  onBriefUpdate,
  onExportBrief: _onExportBrief,
  className,
  isExpanded: _isExpanded = true,
  onToggleExpanded: _onToggleExpanded,
}: BriefPanelProps) {
  const [copiedBrief, setCopiedBrief] = useState(false)

  const completion = calculateBriefCompletion(brief)
  const isReady = isBriefReadyForDesigner(brief)

  // Copy brief to clipboard
  const handleCopyBrief = useCallback(async () => {
    const briefText = `
Task: ${brief.taskSummary.value || 'TBD'}
Intent: ${brief.intent.value || 'TBD'}
Platform: ${brief.platform.value ? PLATFORM_DISPLAY_NAMES[brief.platform.value] : 'TBD'}
Audience: ${brief.audience.value?.name || 'TBD'}
Topic: ${brief.topic.value || 'TBD'}
    `.trim()

    await navigator.clipboard.writeText(briefText)
    setCopiedBrief(true)
    setTimeout(() => setCopiedBrief(false), 2000)
  }, [brief])

  return (
    <div className={cn('flex flex-col h-full bg-transparent', className)}>
      {/* Minimal Header with progress */}
      <div className="shrink-0 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
            Your Brief
          </span>
          <button
            onClick={handleCopyBrief}
            className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {copiedBrief ? (
              <Check className="h-3 w-3 text-ds-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        {/* Progress bar with label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'text-[11px] font-medium',
                isReady
                  ? 'text-crafted-green dark:text-crafted-green-light'
                  : 'text-muted-foreground/70'
              )}
            >
              {isReady ? 'Ready to submit' : `${completion}% complete`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isReady ? 'bg-crafted-green' : 'bg-crafted-green/50'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span
              className={cn(
                'text-[10px] tabular-nums font-medium',
                isReady ? 'text-ds-success' : 'text-muted-foreground/50'
              )}
            >
              {completion}%
            </span>
          </div>
        </div>
      </div>

      {/* Brief Fields -- delegates to the shared redesigned component */}
      <ScrollArea className="flex-1">
        <BriefFieldsContent brief={brief} onBriefUpdate={onBriefUpdate} />
      </ScrollArea>
    </div>
  )
}

// =============================================================================
// COLLAPSIBLE BRIEF PANEL
// =============================================================================

interface CollapsibleBriefPanelProps extends Omit<
  BriefPanelProps,
  'isExpanded' | 'onToggleExpanded'
> {
  defaultExpanded?: boolean
}

export function CollapsibleBriefPanel({
  defaultExpanded = true,
  ...props
}: CollapsibleBriefPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!isExpanded) {
    const completion = calculateBriefCompletion(props.brief)
    const isReady = isBriefReadyForDesigner(props.brief)

    return (
      <motion.div
        initial={{ width: 40 }}
        animate={{ width: 40 }}
        className="flex flex-col items-center py-4 gap-3 h-full"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(true)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium',
            isReady ? 'bg-ds-success/10 text-ds-success' : 'bg-muted text-muted-foreground'
          )}
        >
          {completion}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ width: 260 }} animate={{ width: 260 }} className="h-full">
      <BriefPanel
        {...props}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(false)}
      />
    </motion.div>
  )
}
