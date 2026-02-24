'use client'

import { cn } from '@/lib/utils'

interface ScreenshotFrameProps {
  src: string
  alt: string
  className?: string
  selected?: boolean
  onClick?: () => void
}

export function ScreenshotFrame({ src, alt, className, selected, onClick }: ScreenshotFrameProps) {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
        selected
          ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-800'
          : 'border-border hover:border-green-300 dark:hover:border-green-700',
        className
      )}
      onClick={onClick}
    >
      {/* Browser chrome */}
      <div className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 flex items-center gap-1.5 border-b border-border">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-white dark:bg-zinc-700 rounded px-2 py-0.5 text-[10px] text-muted-foreground truncate">
            {alt}
          </div>
        </div>
      </div>
      {/* Screenshot */}
      <div className="relative aspect-[16/10] bg-gray-50 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover object-top" loading="lazy" />
      </div>
    </div>
  )
}
