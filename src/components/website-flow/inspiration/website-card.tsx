'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { ScreenshotFrame } from '../shared/screenshot-frame'

interface WebsiteCardProps {
  id: string
  name: string
  screenshotUrl: string
  url: string
  industry?: string[]
  styleTags?: string[]
  selected?: boolean
  onSelect?: () => void
  className?: string
}

export function WebsiteCard({
  name,
  screenshotUrl,
  url,
  industry = [],
  styleTags = [],
  selected,
  onSelect,
  className,
}: WebsiteCardProps) {
  return (
    <div className={cn('group relative', className)}>
      <ScreenshotFrame src={screenshotUrl} alt={url} selected={selected} onClick={onSelect} />
      <div className="mt-2 px-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground truncate">{name}</h4>
          {selected && (
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        {(industry.length > 0 || styleTags.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {industry.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              >
                {tag}
              </span>
            ))}
            {styleTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
