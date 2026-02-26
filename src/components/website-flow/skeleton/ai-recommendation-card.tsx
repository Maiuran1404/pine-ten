'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiRecommendationCardProps {
  recommendation: string
  className?: string
}

export function AiRecommendationCard({ recommendation, className }: AiRecommendationCardProps) {
  return (
    <div className={cn('rounded-lg border border-ds-success/30 bg-ds-success/10 p-3', className)}>
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-ds-success mt-0.5 flex-shrink-0" />
        <p className="text-sm text-ds-success">{recommendation}</p>
      </div>
    </div>
  )
}
