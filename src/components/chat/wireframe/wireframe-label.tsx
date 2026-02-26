import { cn } from '@/lib/utils'

// =============================================================================
// WIREFRAME LABEL — floating annotation pill
// =============================================================================

interface WireframeLabelProps {
  children: React.ReactNode
  className?: string
}

export function WireframeLabel({ children, className }: WireframeLabelProps) {
  return (
    <span
      className={cn(
        'inline-block bg-muted-foreground text-background text-[9px] leading-tight px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap',
        className
      )}
    >
      {children}
    </span>
  )
}
