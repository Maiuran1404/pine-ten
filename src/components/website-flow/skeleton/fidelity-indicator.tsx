'use client'

import { cn } from '@/lib/utils'

interface FidelityIndicatorProps {
  level: 'low' | 'mid' | 'high'
  className?: string
}

const FIDELITY_MAP = {
  low: {
    label: 'Wireframe',
    color: 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300',
  },
  mid: {
    label: 'Content',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  },
  high: {
    label: 'Styled',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
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
