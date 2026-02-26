'use client'

import { SectionBlock } from './section-block'
import { FidelityIndicator } from './fidelity-indicator'
import type { GlobalStyles } from './high-fidelity-section'

interface SkeletonSection {
  id: string
  type: string
  title: string
  description: string
  order: number
  fidelity: 'low' | 'mid' | 'high'
  content?: Record<string, unknown>
}

interface SkeletonRendererProps {
  sections: SkeletonSection[]
  globalStyles?: GlobalStyles
  onRemoveSection?: (id: string) => void
  onMoveSection?: (id: string, direction: 'up' | 'down') => void
  className?: string
}

export function SkeletonRenderer({
  sections,
  globalStyles,
  onRemoveSection,
  onMoveSection,
  className,
}: SkeletonRendererProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order)
  const overallFidelity = sorted.length > 0 ? sorted[0].fidelity : 'low'

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-muted-foreground max-w-xs">
          Start chatting to generate your website structure. The AI will create sections based on
          your inspirations.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs text-muted-foreground">
          {sorted.length} section{sorted.length !== 1 ? 's' : ''}
        </span>
        <FidelityIndicator level={overallFidelity} />
      </div>
      <div className="p-4 space-y-3 overflow-auto">
        {/* Browser chrome wrapper */}
        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
          <div className="bg-muted px-3 py-1.5 flex items-center gap-1.5 border-b border-border">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 mx-2">
              <div className="bg-background rounded px-2 py-0.5 text-[10px] text-muted-foreground">
                yourwebsite.com
              </div>
            </div>
          </div>
          <div className="bg-background divide-y divide-border/50">
            {sorted.map((section, index) => (
              <SectionBlock
                key={section.id}
                section={section}
                globalStyles={globalStyles}
                onRemove={onRemoveSection ? () => onRemoveSection(section.id) : undefined}
                onMoveUp={onMoveSection ? () => onMoveSection(section.id, 'up') : undefined}
                onMoveDown={onMoveSection ? () => onMoveSection(section.id, 'down') : undefined}
                isFirst={index === 0}
                isLast={index === sorted.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
