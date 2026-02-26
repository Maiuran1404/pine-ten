'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, MessageSquare } from 'lucide-react'

interface WebsiteFlowLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export function WebsiteFlowLayout({
  leftPanel,
  rightPanel,
  header,
  className,
}: WebsiteFlowLayoutProps) {
  const [mobilePanel, setMobilePanel] = useState<'left' | 'right'>('left')

  return (
    <div className={cn('flex flex-col h-screen bg-background', className)}>
      {header && (
        <div className="flex-shrink-0 border-b border-border bg-background z-10">{header}</div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Desktop: side-by-side panels */}
        {/* Left panel - interaction */}
        <div
          className={cn(
            'md:w-[45%] lg:w-[40%] flex-shrink-0 border-r border-border overflow-hidden',
            mobilePanel === 'left' ? 'w-full' : 'hidden md:block'
          )}
        >
          <div className="h-full overflow-auto">{leftPanel}</div>
        </div>
        {/* Right panel - visual output */}
        <div
          className={cn(
            'flex-1 overflow-hidden',
            mobilePanel === 'right' ? 'flex w-full' : 'hidden md:flex'
          )}
        >
          <div className="h-full w-full overflow-auto bg-muted/50">{rightPanel}</div>
        </div>
      </div>

      {/* Mobile panel toggle */}
      <div className="md:hidden flex-shrink-0 border-t border-border bg-background">
        <div className="flex">
          <button
            onClick={() => setMobilePanel('left')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors',
              mobilePanel === 'left'
                ? 'text-crafted-green border-t-2 border-crafted-green -mt-px'
                : 'text-muted-foreground'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setMobilePanel('right')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors',
              mobilePanel === 'right'
                ? 'text-crafted-green border-t-2 border-crafted-green -mt-px'
                : 'text-muted-foreground'
            )}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  )
}
