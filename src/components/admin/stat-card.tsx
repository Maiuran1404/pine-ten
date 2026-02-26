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
              trend === 'up' && 'bg-ds-success/10 text-ds-success',
              trend === 'down' && 'bg-ds-error/10 text-ds-error',
              trend === 'warning' && 'bg-ds-warning/10 text-ds-warning',
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
