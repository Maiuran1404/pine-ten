'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'

interface ScreenshotFrameProps {
  src: string
  alt: string
  className?: string
  selected?: boolean
  onClick?: () => void
}

function getHostname(urlOrText: string): string {
  try {
    const withProtocol = urlOrText.startsWith('http') ? urlOrText : `https://${urlOrText}`
    return new URL(withProtocol).hostname
  } catch {
    return urlOrText
  }
}

export function ScreenshotFrame({ src, alt, className, selected, onClick }: ScreenshotFrameProps) {
  const [hasError, setHasError] = useState(false)

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
            {getHostname(alt)}
          </div>
        </div>
      </div>
      {/* Screenshot */}
      <div className="relative aspect-[16/10] bg-gray-50 dark:bg-zinc-900">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="w-8 h-8 mb-1" />
            <span className="text-[10px]">Preview unavailable</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover object-top"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>
    </div>
  )
}
