'use client'

import { cn } from '@/lib/utils'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ImagePlaceholder,
  TextLines,
  ButtonShape,
  NavBar,
} from '@/components/chat/wireframe/wireframe-shapes'
import { ProgressiveSection } from './progressive-section'
import { MidFidelitySection } from './mid-fidelity-section'
import { HighFidelitySection } from './high-fidelity-section'
import type { GlobalStyles } from './high-fidelity-section'

interface SectionBlockProps {
  section: {
    id: string
    type: string
    title: string
    description: string
    order: number
    fidelity: 'low' | 'mid' | 'high'
    content?: Record<string, unknown>
  }
  globalStyles?: GlobalStyles
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
  className?: string
}

function LowFidelitySection({ type }: { type: string }) {
  switch (type) {
    case 'navigation':
      return <NavBar />
    case 'hero':
      return (
        <div className="py-12 px-8 space-y-4">
          <TextLines lines={1} size="lg" widths={[60]} />
          <TextLines lines={2} size="sm" widths={[80, 50]} />
          <ButtonShape width="w-28" />
        </div>
      )
    case 'features':
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[40]} className="mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="w-8 h-8 rounded bg-muted border border-border" />
                <TextLines lines={2} size="sm" widths={[90, 60]} />
              </div>
            ))}
          </div>
        </div>
      )
    case 'testimonials':
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[35]} className="mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border border-border rounded-lg space-y-2">
                <TextLines lines={3} size="sm" widths={[100, 90, 60]} />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted" />
                  <TextLines lines={1} size="sm" widths={[40]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    case 'cta':
      return (
        <div className="py-12 px-8 text-center space-y-4">
          <TextLines lines={1} size="lg" widths={[50]} className="mx-auto" />
          <TextLines lines={1} size="sm" widths={[70]} className="mx-auto" />
          <div className="flex justify-center">
            <ButtonShape width="w-32" />
          </div>
        </div>
      )
    case 'gallery':
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[30]} className="mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ImagePlaceholder key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      )
    case 'pricing':
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[30]} className="mb-4 mx-auto text-center" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-border rounded-lg space-y-3">
                <TextLines lines={1} size="md" widths={[60]} />
                <TextLines lines={1} size="lg" widths={[40]} />
                <TextLines lines={3} size="sm" widths={[90, 80, 70]} />
                <ButtonShape width="w-full" />
              </div>
            ))}
          </div>
        </div>
      )
    case 'contact':
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[30]} className="mb-4" />
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded border border-border bg-muted/50" />
              ))}
              <div className="h-20 rounded border border-border bg-muted/50" />
              <ButtonShape width="w-24" />
            </div>
            <div className="space-y-2">
              <TextLines lines={4} size="sm" widths={[80, 70, 60, 90]} />
            </div>
          </div>
        </div>
      )
    case 'footer':
      return (
        <div className="py-6 px-8 bg-muted/50/50">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <TextLines lines={4} size="sm" widths={[50, 70, 60, 40]} />
              </div>
            ))}
          </div>
        </div>
      )
    default:
      return (
        <div className="py-8 px-8">
          <TextLines lines={1} size="md" widths={[40]} className="mb-3" />
          <TextLines lines={3} size="sm" widths={[90, 80, 60]} />
        </div>
      )
  }
}

export function SectionBlock({
  section,
  globalStyles,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  className,
}: SectionBlockProps) {
  return (
    <div
      className={cn(
        'group relative border border-border rounded-lg overflow-hidden bg-card transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* Hover controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isFirst && onMoveUp && (
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onMoveUp}>
            <ChevronUp className="w-3 h-3" />
          </Button>
        )}
        {!isLast && onMoveDown && (
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onMoveDown}>
            <ChevronDown className="w-3 h-3" />
          </Button>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 text-ds-error hover:text-ds-error"
            onClick={onRemove}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Compact section label */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide bg-background/80 px-1.5 py-0.5 rounded">
          {section.title}
        </span>
      </div>

      {/* Wireframe content */}
      <div className="pt-8">
        <ProgressiveSection
          section={section}
          globalStyles={globalStyles}
          lowFidelityRenderer={<LowFidelitySection type={section.type} />}
          midFidelityRenderer={<MidFidelitySection type={section.type} content={section.content} />}
          highFidelityRenderer={
            <HighFidelitySection
              type={section.type}
              globalStyles={globalStyles}
              content={section.content}
            />
          }
        />
      </div>
    </div>
  )
}
