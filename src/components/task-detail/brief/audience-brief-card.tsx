'use client'

import { Users } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AudienceBrief } from '@/components/task-detail/types'

interface AudienceBriefCardProps {
  audience: AudienceBrief
}

export function AudienceBriefCard({ audience }: AudienceBriefCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Target Audience</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{audience.name}</p>

        {audience.demographics && (
          <p className="text-sm text-muted-foreground">{audience.demographics}</p>
        )}

        {audience.psychographics && (
          <p className="text-sm text-muted-foreground">{audience.psychographics}</p>
        )}

        {audience.painPoints && audience.painPoints.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pain Points
            </span>
            <div className="flex flex-wrap gap-1.5">
              {audience.painPoints.map((point) => (
                <Badge
                  key={point}
                  variant="outline"
                  className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"
                >
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {audience.goals && audience.goals.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Goals
            </span>
            <div className="flex flex-wrap gap-1.5">
              {audience.goals.map((goal) => (
                <Badge
                  key={goal}
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                >
                  {goal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
