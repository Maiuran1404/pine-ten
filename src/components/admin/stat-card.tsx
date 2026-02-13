'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  subtext?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral' | 'warning'
  className?: string
}

/**
 * Reusable stat card component for admin dashboards
 * Provides consistent styling across all admin pages
 */
export function StatCard({ label, value, subtext, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div
            className={cn(
              'p-3 rounded-xl transition-colors',
              trend === 'up' && 'bg-green-500/10 text-green-600 dark:text-green-400',
              trend === 'down' && 'bg-red-500/10 text-red-600 dark:text-red-400',
              trend === 'warning' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
              (!trend || trend === 'neutral') && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
