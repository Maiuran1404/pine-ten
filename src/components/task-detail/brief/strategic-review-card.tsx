import { Shield, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import type { StrategicReviewData } from '@/components/task-detail/types'

interface StrategicReviewCardProps {
  strategicReview: StrategicReviewData
}

export function StrategicReviewCard({ strategicReview: review }: StrategicReviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Strategic Review</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Strengths */}
        {review.strengths.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ds-success">
              Strengths
            </span>
            <ul className="space-y-1.5">
              {review.strengths.map((strength) => (
                <li key={strength} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ds-success" />
                  <span className="text-ds-success">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {review.risks.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-ds-warning">
              Risks
            </span>
            <ul className="space-y-1.5">
              {review.risks.map((risk) => (
                <li key={risk} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ds-warning" />
                  <span className="text-ds-warning">{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimization Suggestion */}
        {review.optimizationSuggestion && (
          <div className="rounded-lg border border-ds-info/30 bg-ds-info/5 p-3 dark:border-ds-info/30 dark:bg-ds-info/10">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-ds-info" />
              <p className="text-sm text-ds-info">{review.optimizationSuggestion}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
