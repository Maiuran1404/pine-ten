'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STYLE_OPTIONS = [
  'Cinematic',
  'Minimal',
  'Bold / Energetic',
  'Corporate',
  'Organic / Natural',
  'Retro / Vintage',
  'Tech / Futuristic',
] as const

const DURATION_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
] as const

const PLATFORM_OPTIONS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'X'] as const

interface QuickBriefFormProps {
  onSubmit: (brief: QuickBriefData) => void
  isLoading?: boolean
  className?: string
}

export interface QuickBriefData {
  goal: string
  audience: string
  style: string
  duration: number
  platforms: string[]
}

export function QuickBriefForm({ onSubmit, isLoading, className }: QuickBriefFormProps) {
  const [goal, setGoal] = useState('')
  const [audience, setAudience] = useState('')
  const [style, setStyle] = useState('')
  const [duration, setDuration] = useState(30)
  const [platforms, setPlatforms] = useState<string[]>([])

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const isValid = goal.trim().length > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({ goal, audience, style, duration, platforms })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Zap className="h-4 w-4 text-amber-500" />
        Quick Brief
      </div>

      {/* Goal */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Goal <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Launch video for our new product"
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/30 outline-none"
        />
      </div>

      {/* Audience */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Target Audience</label>
        <input
          type="text"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. SaaS founders, 25–45"
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/30 outline-none"
        />
      </div>

      {/* Style */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Style</label>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStyle(style === s ? '' : s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border transition-colors',
                style === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Duration</label>
        <div className="flex gap-1.5">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border transition-colors flex-1',
                duration === d.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Platforms</label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border transition-colors',
                platforms.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={!isValid || isLoading} className="w-full gap-2">
        <Zap className="h-4 w-4" />
        {isLoading ? 'Creating brief...' : 'Generate Storyboard'}
      </Button>
    </div>
  )
}
