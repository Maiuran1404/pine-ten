'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =============================================================================
// WIREFRAME CANVAS — dot-grid background container
// =============================================================================

interface WireframeCanvasProps {
  children: ReactNode
  className?: string
}

export function WireframeCanvas({ children, className }: WireframeCanvasProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm overflow-hidden',
        className
      )}
      style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--border) / 0.3) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// BROWSER CHROME — top bar with traffic lights + url bar
// =============================================================================

interface BrowserChromeProps {
  children: ReactNode
  className?: string
}

export function BrowserChrome({ children, className }: BrowserChromeProps) {
  return (
    <WireframeCanvas className={cn('flex flex-col', className)}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/30">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        {/* URL bar */}
        <div className="flex-1 mx-8">
          <div className="h-5 rounded-md bg-muted/50 border border-border/30" />
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </WireframeCanvas>
  )
}
