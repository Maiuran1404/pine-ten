import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaskDetailData } from '@/components/task-detail/types'

interface BriefSummaryCardProps {
  task: TaskDetailData
}

export function BriefSummaryCard({ task }: BriefSummaryCardProps) {
  const platform = task.briefData?.platform?.value
  const intent = task.briefData?.intent?.value
  const audience = task.briefData?.audience?.value?.name
  const dimensions = task.briefData?.dimensions

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brief Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badge row */}
        <div className="flex flex-wrap gap-2">
          {task.category?.name && <Badge variant="secondary">{task.category.name}</Badge>}
          {platform && <Badge variant="outline">{platform}</Badge>}
          {intent && <Badge variant="outline">{intent}</Badge>}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
        )}

        {/* Audience */}
        {audience && (
          <div className="text-sm">
            <span className="font-medium text-foreground">Audience:</span>{' '}
            <span className="text-muted-foreground">{audience}</span>
          </div>
        )}

        {/* Dimensions */}
        {dimensions && dimensions.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-foreground">Dimensions:</span>{' '}
            <span className="text-muted-foreground">
              {dimensions.map((d) => `${d.width}x${d.height}`).join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
