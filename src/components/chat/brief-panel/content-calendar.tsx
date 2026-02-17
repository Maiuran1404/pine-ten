'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Film,
  LayoutGrid,
  CircleDot,
  FileText,
  Megaphone,
  MessageCircle,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type {
  ContentCalendarOutline,
  ContentPillar,
  ContentPost,
  CTAEscalationPlan,
} from '@/lib/ai/briefing-state-machine'

// =============================================================================
// PROPS
// =============================================================================

interface ContentCalendarProps {
  outline: ContentCalendarOutline
  className?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PILLAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

const PILLAR_BG_COLORS = [
  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40',
  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',
  'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/40',
  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40',
  'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40',
  'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/40',
]

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

const DAY_MAP: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

// =============================================================================
// HELPERS
// =============================================================================

function getDayIndex(dayOfWeek: string): number {
  return DAY_MAP[dayOfWeek.toLowerCase()] ?? -1
}

function FormatIcon({ format, className }: { format: string; className?: string }) {
  const f = format.toLowerCase()
  if (f.includes('reel') || f.includes('video')) return <Film className={className} />
  if (f.includes('carousel') || f.includes('grid')) return <LayoutGrid className={className} />
  if (f.includes('story') || f.includes('stories')) return <CircleDot className={className} />
  return <FileText className={className} />
}

function getPostRotation(index: number): string {
  const rotations = [-2, 1.5, -1, 2, -0.5, 1, -1.5, 0.5]
  return `${rotations[index % rotations.length]}deg`
}

function getPillarIndex(post: ContentPost, pillarNames: string[]): number {
  const idx = pillarNames.findIndex((name) => post.topic.toLowerCase().includes(name.toLowerCase()))
  return idx >= 0 ? idx : 0
}

// =============================================================================
// CALENDAR HEADER
// =============================================================================

function CalendarHeader({
  outline,
  totalPosts,
}: {
  outline: ContentCalendarOutline
  totalPosts: number
}) {
  return (
    <div className="space-y-3">
      {/* Title row */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Content Calendar</span>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {outline.totalDuration && (
          <Badge variant="outline" className="text-[10px] h-5">
            {outline.totalDuration}
          </Badge>
        )}
        {outline.postingCadence && <span>{outline.postingCadence}</span>}
        {outline.platforms.length > 0 && <span>{outline.platforms.join(', ')}</span>}
        <Badge variant="secondary" className="text-[10px] h-5">
          {totalPosts} posts
        </Badge>
      </div>

      {/* Pillar legend */}
      {outline.contentPillars.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {outline.contentPillars.map((pillar: ContentPillar, i: number) => (
            <div key={pillar.name} className="flex items-center gap-1.5">
              <div
                className={cn('w-2 h-2 rounded-full', PILLAR_COLORS[i % PILLAR_COLORS.length])}
              />
              <span className="text-[10px] text-muted-foreground">{pillar.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// POST NOTE (sticky note inside a day cell)
// =============================================================================

function PostNote({
  post,
  pillarIndex,
  noteIndex,
}: {
  post: ContentPost
  pillarIndex: number
  noteIndex: number
}) {
  const [hovered, setHovered] = useState(false)
  const isPillar = post.pillarType === 'pillar'

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          'rounded border p-1.5 transition-shadow cursor-default',
          isPillar
            ? PILLAR_BG_COLORS[pillarIndex % PILLAR_BG_COLORS.length]
            : 'bg-muted/40 border-border/30'
        )}
        style={{ transform: `rotate(${getPostRotation(noteIndex)})` }}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <FormatIcon format={post.format} className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground truncate">{post.format}</span>
        </div>
        <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
          {post.topic}
        </p>
      </div>

      {/* Hover popover */}
      {hovered && (
        <div className="absolute z-20 left-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover p-2.5 shadow-lg text-xs space-y-1.5">
          <p className="font-medium text-foreground">{post.topic}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FormatIcon format={post.format} className="h-3 w-3 shrink-0" />
            <span>{post.format}</span>
            <span className="mx-1">·</span>
            <span>{post.dayOfWeek}</span>
          </div>
          {post.cta && (
            <p className="text-muted-foreground">
              <span className="font-medium">CTA:</span> {post.cta}
            </p>
          )}
          {post.engagementTrigger && (
            <p className="text-muted-foreground">
              <span className="font-medium">Trigger:</span> {post.engagementTrigger}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// CALENDAR GRID
// =============================================================================

function CalendarGrid({
  outline,
  pillarNames,
}: {
  outline: ContentCalendarOutline
  pillarNames: string[]
}) {
  let globalNoteIndex = 0

  return (
    <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-px bg-border/30 rounded-lg overflow-hidden border border-border/40">
      {/* Day headers row */}
      <div className="bg-muted/30 p-1.5" />
      {DAY_LABELS.map((label, i) => (
        <div
          key={i}
          className="bg-muted/30 p-1.5 text-center text-[10px] font-medium text-muted-foreground"
        >
          {label}
        </div>
      ))}

      {/* Week rows */}
      {outline.weeks.map((week, weekIdx) => {
        // Build a map of day index -> posts for this week
        const dayPosts: Record<number, ContentPost[]> = {}
        for (const post of week.posts) {
          const dayIdx = getDayIndex(post.dayOfWeek)
          if (dayIdx >= 0) {
            if (!dayPosts[dayIdx]) dayPosts[dayIdx] = []
            dayPosts[dayIdx].push(post)
          }
        }

        return (
          <motion.div
            key={week.weekNumber}
            className="contents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: weekIdx * 0.06, duration: 0.3 }}
          >
            {/* Week label cell */}
            <div className="bg-muted/10 p-1.5 flex flex-col items-center justify-start gap-0.5">
              <span className="text-[10px] font-semibold text-foreground">W{week.weekNumber}</span>
              <span className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-3">
                {week.theme}
              </span>
            </div>

            {/* 7 day cells */}
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const posts = dayPosts[dayIdx] ?? []
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'bg-background min-h-[60px] p-1 space-y-1',
                    posts.length === 0 && 'bg-muted/5'
                  )}
                >
                  {posts.map((post) => {
                    const ni = globalNoteIndex++
                    const pi = getPillarIndex(post, pillarNames)
                    return (
                      <PostNote
                        key={`${week.weekNumber}-${dayIdx}-${ni}`}
                        post={post}
                        pillarIndex={pi}
                        noteIndex={ni}
                      />
                    )
                  })}
                </div>
              )
            })}
          </motion.div>
        )
      })}
    </div>
  )
}

// =============================================================================
// CTA ESCALATION FLOW
// =============================================================================

function CTAEscalationFlow({ plan }: { plan: CTAEscalationPlan }) {
  const phases = [
    {
      label: 'Awareness',
      icon: Megaphone,
      data: plan.awarenessPhase,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      ring: 'ring-blue-200 dark:ring-blue-800/40',
    },
    {
      label: 'Engagement',
      icon: MessageCircle,
      data: plan.engagementPhase,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      ring: 'ring-amber-200 dark:ring-amber-800/40',
    },
    {
      label: 'Conversion',
      icon: ShoppingCart,
      data: plan.conversionPhase,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      ring: 'ring-emerald-200 dark:ring-emerald-800/40',
    },
  ]

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">CTA Escalation</span>
      <div className="flex items-center justify-center gap-2">
        {phases.map((phase, i) => (
          <div key={phase.label} className="flex items-center gap-2">
            {/* Phase circle + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center ring-2',
                  phase.bg,
                  phase.ring
                )}
              >
                <phase.icon className={cn('h-4 w-4', phase.color)} />
              </div>
              <span className={cn('text-[10px] font-semibold', phase.color)}>{phase.label}</span>
              <span className="text-[9px] text-muted-foreground text-center max-w-[80px] line-clamp-2">
                {phase.data.ctaStyle}
              </span>
            </div>

            {/* Arrow between phases */}
            {i < phases.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 -mt-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function CalendarEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Calendar className="h-8 w-8 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">Content calendar will appear here</p>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ContentCalendar({ outline, className }: ContentCalendarProps) {
  const isEmpty = outline.weeks.length === 0 && outline.contentPillars.length === 0

  if (isEmpty) {
    return <CalendarEmpty />
  }

  const totalPosts = outline.weeks.reduce((acc, w) => acc + w.posts.length, 0)
  const pillarNames = outline.contentPillars.map((p) => p.name)

  return (
    <motion.div
      className={cn('space-y-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CalendarHeader outline={outline} totalPosts={totalPosts} />

      {outline.weeks.length > 0 && <CalendarGrid outline={outline} pillarNames={pillarNames} />}

      {outline.ctaEscalation && <CTAEscalationFlow plan={outline.ctaEscalation} />}
    </motion.div>
  )
}
