'use client'

import { cn } from '@/lib/utils'

interface FidelityIndicatorProps {
  level: 'low' | 'mid' | 'high'
  className?: string
}

const FIDELITY_MAP = {
  low: {
    label: 'Wireframe',
    color: 'bg-muted text-muted-foreground',
  },
  mid: {
    label: 'Content',
    color: 'bg-ds-info/10 text-ds-info',
  },
  high: {
    label: 'Styled',
    color: 'bg-ds-success/10 text-ds-success',
  },
}

export function FidelityIndicator({ level, className }: FidelityIndicatorProps) {
  const config = FIDELITY_MAP[level]
  return (
    <span
      className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', config.color, className)}
    >
      {config.label}
    </span>
  )
}
