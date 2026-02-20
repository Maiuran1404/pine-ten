'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Native scroll area replacement for @radix-ui/react-scroll-area.
 *
 * Radix ScrollArea has a React 19 incompatibility: its internal
 * `useComposedRefs(forwardedRef, (node) => setScrollArea(node))` creates an
 * unstable callback ref on every render, causing an infinite
 * setState → re-render → ref detach/reattach loop that crashes with
 * "Maximum update depth exceeded".
 *
 * This native implementation provides the same API surface (className, ref,
 * children) with identical data-slot attributes so existing querySelector
 * calls (e.g. `[data-radix-scroll-area-viewport]`) continue to work.
 */
function ScrollArea({ className, children, ref, ...props }: React.ComponentPropsWithRef<'div'>) {
  return (
    <div
      ref={ref}
      data-slot="scroll-area"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <div
        data-slot="scroll-area-viewport"
        data-radix-scroll-area-viewport=""
        className="size-full overflow-y-auto overflow-x-hidden rounded-[inherit]"
      >
        {children}
      </div>
    </div>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
}: {
  className?: string
  orientation?: 'vertical' | 'horizontal'
}) {
  // Native scrollbars are used instead of custom Radix scrollbars.
  // This component is kept for API compatibility but renders nothing.
  void className
  void orientation
  return null
}

export { ScrollArea, ScrollBar }
