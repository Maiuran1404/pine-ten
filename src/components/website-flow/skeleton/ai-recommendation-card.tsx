'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiRecommendationCardProps {
  recommendation: string
  className?: string
}

export function AiRecommendationCard({ recommendation, className }: AiRecommendationCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-green-800 dark:text-green-300">{recommendation}</p>
      </div>
    </div>
  )
}
