'use client'

import { GripVertical } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

import { cn } from '@/lib/utils'

function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof Group>) {
  return <Group className={cn('flex h-full w-full', className)} {...props} />
}

const ResizablePanel = Panel

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      className={cn(
        'relative flex w-1 items-center justify-center bg-border/50 hover:bg-border transition-colors after:absolute after:inset-y-0 after:-left-2 after:-right-2 after:content-[""] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-col-resize',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-3.5 items-center justify-center rounded-sm border bg-border shadow-sm">
          <GripVertical className="h-3 w-3 text-muted-foreground/60" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
