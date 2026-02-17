'use client'

import { cn } from '@/lib/utils'

// =============================================================================
// SHARED WIREFRAME SHAPE PRIMITIVES
// =============================================================================

const STROKE = 'border-slate-300 dark:border-slate-600'
const FILL = 'bg-slate-100 dark:bg-slate-800'

// =============================================================================
// IMAGE PLACEHOLDER — rect with diagonal X cross
// =============================================================================

interface ImagePlaceholderProps {
  className?: string
}

export function ImagePlaceholder({ className }: ImagePlaceholderProps) {
  return (
    <div className={cn('relative border rounded-sm overflow-hidden', STROKE, FILL, className)}>
      {/* Diagonal X cross via SVG */}
      <svg
        className="absolute inset-0 w-full h-full text-slate-300 dark:text-slate-600"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  )
}

// =============================================================================
// TEXT LINES — horizontal bars of varying width
// =============================================================================

interface TextLinesProps {
  lines?: number
  widths?: number[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TextLines({ lines = 3, widths, size = 'sm', className }: TextLinesProps) {
  const defaultWidths = [100, 85, 60, 90, 70, 50]
  const resolvedWidths = widths ?? defaultWidths.slice(0, lines)
  const heightClass = size === 'lg' ? 'h-2.5' : size === 'md' ? 'h-2' : 'h-1.5'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {resolvedWidths.map((w, i) => (
        <div key={i} className={cn('rounded-full', heightClass, FILL)} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// =============================================================================
// BUTTON SHAPE — rounded pill
// =============================================================================

interface ButtonShapeProps {
  width?: string
  className?: string
}

export function ButtonShape({ width = 'w-20', className }: ButtonShapeProps) {
  return (
    <div
      className={cn(
        'h-5 rounded-full border',
        STROKE,
        'bg-slate-200 dark:bg-slate-700',
        width,
        className
      )}
    />
  )
}

// =============================================================================
// CIRCLE ICON — small circle placeholder
// =============================================================================

interface CircleIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CircleIcon({ size = 'md', className }: CircleIconProps) {
  const sizeClass = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return <div className={cn('rounded-full border', STROKE, FILL, sizeClass, className)} />
}

// =============================================================================
// NAV BAR — thin bar with logo block + link dots
// =============================================================================

interface NavBarProps {
  className?: string
}

export function NavBar({ className }: NavBarProps) {
  return (
    <div className={cn('flex items-center justify-between px-3 py-2 border-b', STROKE, className)}>
      {/* Logo block */}
      <div className={cn('w-12 h-3 rounded-sm', FILL)} />
      {/* Link dots */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('w-6 h-1.5 rounded-full', FILL)} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// BLOCK RECT — generic rectangular block
// =============================================================================

interface BlockRectProps {
  className?: string
}

export function BlockRect({ className }: BlockRectProps) {
  return <div className={cn('border rounded-sm', STROKE, FILL, className)} />
}

// =============================================================================
// CHECK ROW — horizontal row with check icon + text line
// =============================================================================

interface CheckRowProps {
  className?: string
}

export function CheckRow({ className }: CheckRowProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-3 h-3 rounded-sm border', STROKE, FILL)} />
      <div className={cn('h-1.5 rounded-full flex-1', FILL)} />
    </div>
  )
}

// =============================================================================
// CHEVRON BAR — horizontal bar with right chevron indicator
// =============================================================================

interface ChevronBarProps {
  className?: string
}

export function ChevronBar({ className }: ChevronBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 border rounded-sm',
        STROKE,
        FILL,
        className
      )}
    >
      <div className="h-1.5 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
      <svg
        className="w-3 h-3 text-slate-400 dark:text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

// =============================================================================
// QUOTE GLYPH — centered quote mark
// =============================================================================

interface QuoteGlyphProps {
  className?: string
}

export function QuoteGlyph({ className }: QuoteGlyphProps) {
  return (
    <div className={cn('text-slate-300 dark:text-slate-600 font-serif leading-none', className)}>
      &ldquo;
    </div>
  )
}
