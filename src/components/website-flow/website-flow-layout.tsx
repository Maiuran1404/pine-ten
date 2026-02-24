'use client'

import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('flex flex-col h-screen bg-background', className)}>
      {header && (
        <div className="flex-shrink-0 border-b border-border bg-background z-10">{header}</div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Left panel - interaction */}
        <div className="w-full md:w-[45%] lg:w-[40%] flex-shrink-0 border-r border-border overflow-hidden">
          <div className="h-full overflow-auto">{leftPanel}</div>
        </div>
        {/* Right panel - visual output */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="h-full w-full overflow-auto bg-gray-50 dark:bg-zinc-950">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
