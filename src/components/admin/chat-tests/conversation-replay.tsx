'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Bot, User, Zap, FileText, Cpu } from 'lucide-react'
import type { StructureData, StrategicReviewData } from '@/lib/ai/briefing-state-machine'
import { StoryboardSummaryCard } from '@/components/chat/storyboard-view'
import { LayoutPreview } from '@/components/chat/layout-preview'
import { ContentCalendar } from '@/components/chat/brief-panel/content-calendar'
import { DesignSpecView } from '@/components/chat/design-spec-view'
import { StrategicReviewCard } from '@/components/chat/strategic-review-card'

export interface Message {
  turn: number
  role: 'user' | 'assistant'
  content: string
  stage: string
  quickOptions?: { question: string; options: string[] } | null
  hasStructureData: boolean
  hasStrategicReview: boolean
  structureData?: StructureData | null
  strategicReviewData?: StrategicReviewData | null
  deliverableStyleCount: number
  videoReferenceCount: number
  generatedBy?: 'quick_option' | 'template' | 'haiku'
  durationMs?: number
}

interface ConversationReplayProps {
  messages: Message[]
}

function generatedByLabel(method?: string) {
  switch (method) {
    case 'quick_option':
      return { label: 'Quick Option', icon: Zap, color: 'text-amber-600' }
    case 'template':
      return { label: 'Template', icon: FileText, color: 'text-blue-600' }
    case 'haiku':
      return { label: 'Haiku', icon: Cpu, color: 'text-purple-600' }
    default:
      return null
  }
}

const noopAction = () => {}

function RichStructureContent({ data }: { data: StructureData }) {
  switch (data.type) {
    case 'storyboard':
      return <StoryboardSummaryCard scenes={data.scenes} className="mt-2" />
    case 'layout':
      return <LayoutPreview sections={data.sections} className="mt-2" />
    case 'calendar':
      return <ContentCalendar outline={data.outline} className="mt-2" />
    case 'single_design':
      return <DesignSpecView specification={data.specification} className="mt-2" />
    default:
      return null
  }
}

export function ConversationReplay({ messages }: ConversationReplayProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg, idx) => {
        const showStageChange = idx === 0 || msg.stage !== messages[idx - 1].stage

        return (
          <div key={idx}>
            {showStageChange && (
              <div className="flex justify-center my-3">
                <Badge variant="outline" className="text-xs font-mono">
                  {msg.stage}
                </Badge>
              </div>
            )}

            <div
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[75%] rounded-lg p-3 space-y-2',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content}
                </p>

                {/* Rich structure content */}
                {msg.role === 'assistant' && msg.structureData && (
                  <RichStructureContent data={msg.structureData} />
                )}

                {/* Strategic review content */}
                {msg.role === 'assistant' && msg.strategicReviewData && (
                  <StrategicReviewCard
                    review={msg.strategicReviewData}
                    onAction={noopAction}
                    disabled
                    className="mt-2"
                  />
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.role === 'user' &&
                    msg.generatedBy &&
                    (() => {
                      const gen = generatedByLabel(msg.generatedBy)
                      if (!gen) return null
                      const Icon = gen.icon
                      return (
                        <span
                          className={cn(
                            'flex items-center gap-1 text-[10px]',
                            msg.role === 'user' ? 'text-primary-foreground/70' : gen.color
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {gen.label}
                        </span>
                      )
                    })()}

                  {msg.role === 'assistant' && msg.durationMs && (
                    <span className="text-[10px] text-muted-foreground">
                      {msg.durationMs < 1000
                        ? `${msg.durationMs}ms`
                        : `${(msg.durationMs / 1000).toFixed(1)}s`}
                    </span>
                  )}

                  {msg.deliverableStyleCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {msg.deliverableStyleCount} styles
                    </Badge>
                  )}

                  {msg.videoReferenceCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {msg.videoReferenceCount} videos
                    </Badge>
                  )}

                  {msg.hasStructureData && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      structure
                    </Badge>
                  )}

                  {msg.hasStrategicReview && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      review
                    </Badge>
                  )}
                </div>

                {/* Quick options display */}
                {msg.quickOptions && msg.quickOptions.options.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground">{msg.quickOptions.question}</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.quickOptions.options.map((opt, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] font-normal">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
