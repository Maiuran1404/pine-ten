'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Megaphone,
  MessageCircle,
  ShoppingCart,
  Zap,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type {
  ContentCalendarOutline,
  ContentPillar,
  ContentWeek,
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
// PILLAR BAR
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

function PillarBar({ pillars }: { pillars: ContentPillar[] }) {
  if (pillars.length === 0) return null

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">Content Pillars</span>
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-2">
        {pillars.map((pillar, i) => (
          <div
            key={pillar.name}
            className={cn(PILLAR_COLORS[i % PILLAR_COLORS.length])}
            style={{ width: `${pillar.percentage}%` }}
            title={`${pillar.name}: ${pillar.percentage}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {pillars.map((pillar, i) => (
          <div key={pillar.name} className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full', PILLAR_COLORS[i % PILLAR_COLORS.length])} />
            <span className="text-[10px] text-muted-foreground">
              {pillar.name} ({pillar.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// CTA ESCALATION
// =============================================================================

function CTAEscalation({ plan }: { plan: CTAEscalationPlan }) {
  const phases = [
    {
      label: 'Awareness',
      icon: Megaphone,
      data: plan.awarenessPhase,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Engagement',
      icon: MessageCircle,
      data: plan.engagementPhase,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Conversion',
      icon: ShoppingCart,
      data: plan.conversionPhase,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
  ]

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">CTA Escalation</span>
      <div className="grid grid-cols-3 gap-2">
        {phases.map((phase) => (
          <div
            key={phase.label}
            className={cn('rounded-lg border border-border/40 p-2.5 space-y-1', phase.bg)}
          >
            <div className={cn('flex items-center gap-1', phase.color)}>
              <phase.icon className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {phase.label}
              </span>
            </div>
            <p className="text-xs text-foreground">{phase.data.ctaStyle}</p>
            <p className="text-[10px] text-muted-foreground">Weeks {phase.data.weeks.join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// POST CARD
// =============================================================================

function PostCard({ post, pillarIndex }: { post: ContentPost; pillarIndex: number }) {
  const isPillar = post.pillarType === 'pillar'

  return (
    <div
      className={cn(
        'rounded-lg border p-2.5 transition-colors',
        isPillar
          ? cn('border', PILLAR_BG_COLORS[pillarIndex % PILLAR_BG_COLORS.length])
          : 'border-border/30 bg-muted/20'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          {post.dayOfWeek}
        </span>
        <Badge
          variant={isPillar ? 'default' : 'outline'}
          className={cn('text-[9px] h-4', isPillar ? '' : 'text-muted-foreground')}
        >
          {isPillar ? 'Pillar' : 'Support'}
        </Badge>
      </div>
      <p className="text-xs font-medium text-foreground line-clamp-2">{post.topic}</p>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground">{post.format}</span>
        {post.engagementTrigger && (
          <div className="flex items-center gap-0.5 text-[10px] text-primary/70">
            <Zap className="h-2.5 w-2.5" />
            <span className="truncate max-w-[120px]">{post.engagementTrigger}</span>
          </div>
        )}
      </div>
      {post.cta && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 italic truncate">CTA: {post.cta}</p>
      )}
    </div>
  )
}

// =============================================================================
// WEEK ROW
// =============================================================================

function WeekRow({
  week,
  pillarNames,
  defaultExpanded,
}: {
  week: ContentWeek
  pillarNames: string[]
  defaultExpanded: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const getPillarIndex = (post: ContentPost) => {
    // Try to match post topic to a pillar
    const idx = pillarNames.findIndex(
      (name) =>
        post.topic.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(post.topic.toLowerCase().split(' ')[0])
    )
    return idx >= 0 ? idx : 0
  }

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      {/* Week header */}
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
          <span className="text-sm font-medium">Week {week.weekNumber}</span>
          <span className="text-xs text-muted-foreground">· {week.theme}</span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5">
          {week.posts.length} {week.posts.length === 1 ? 'post' : 'posts'}
        </Badge>
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
            <div className="px-3 pt-2 pb-3 space-y-2">
              {/* Narrative arc */}
              {week.narrativeArc && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground italic pb-2 border-b border-border/20">
                  <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{week.narrativeArc}</span>
                </div>
              )}

              {/* Posts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {week.posts.map((post, idx) => (
                  <PostCard
                    key={`${week.weekNumber}-${idx}`}
                    post={post}
                    pillarIndex={getPillarIndex(post)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      <p className="text-xs text-muted-foreground/70 mt-1">
        Strategic posting schedule with pillars, arcs, and CTAs
      </p>
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
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Content Calendar</span>
        </div>
        <div className="flex items-center gap-2">
          {outline.totalDuration && (
            <Badge variant="outline" className="text-[10px] h-5">
              {outline.totalDuration}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] h-5">
            {totalPosts} posts
          </Badge>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {outline.postingCadence && (
          <span>
            <BarChart3 className="h-3 w-3 inline mr-1" />
            {outline.postingCadence}
          </span>
        )}
        {outline.platforms.length > 0 && <span>Platforms: {outline.platforms.join(', ')}</span>}
        {outline.distributionLogic && (
          <span className="text-muted-foreground/70">{outline.distributionLogic}</span>
        )}
      </div>

      {/* Content Pillars */}
      {outline.contentPillars.length > 0 && <PillarBar pillars={outline.contentPillars} />}

      {/* CTA Escalation */}
      {outline.ctaEscalation && <CTAEscalation plan={outline.ctaEscalation} />}

      {/* Weeks */}
      {outline.weeks.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Weekly Schedule</span>
          {outline.weeks.map((week) => (
            <WeekRow
              key={week.weekNumber}
              week={week}
              pillarNames={pillarNames}
              defaultExpanded={week.weekNumber === 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
