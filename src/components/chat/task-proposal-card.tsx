'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins, Clock, Sparkles, Pencil } from 'lucide-react'
import { TaskProposal, getDeliveryDateString } from './types'
import { LoadingSpinner } from '@/components/shared/loading'

interface TaskProposalCardProps {
  proposal: TaskProposal
  /** If provided, shows action buttons for submission */
  showActions?: boolean
  onSubmit?: () => void
  onMakeChanges?: () => void
  isLoading?: boolean
  userCredits?: number
}

/**
 * Displays a task proposal summary with credits and delivery estimate
 * Optionally includes action buttons for submission
 */
export function TaskProposalCard({
  proposal,
  showActions = false,
  onSubmit,
  onMakeChanges,
  isLoading = false,
  userCredits = 0,
}: TaskProposalCardProps) {
  const creditsRequired = proposal.creditsRequired ?? 15
  const hasEnoughCredits = userCredits >= creditsRequired

  return (
    <Card className="bg-muted/30 border-crafted-green/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-crafted-green/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-crafted-green" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-base">{proposal.title || 'Task Summary'}</h4>
            <p className="text-sm text-muted-foreground mt-1">{proposal.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 ml-11">
          <Badge variant="outline" className="flex items-center gap-1 bg-background">
            <Coins className="h-3 w-3" aria-hidden="true" />
            {creditsRequired} credits
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 bg-background">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {getDeliveryDateString(proposal.deliveryDays || 3)}
          </Badge>
          {userCredits > 0 && (
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                hasEnoughCredits
                  ? 'text-crafted-green border-crafted-green/30 bg-crafted-green/10'
                  : 'text-ds-error border-ds-error/30 bg-ds-error/10'
              }`}
            >
              You have {userCredits} credits
            </Badge>
          )}
        </div>

        {showActions && (
          <div className="ml-11">
            {!hasEnoughCredits && (
              <div className="mb-3 p-2 rounded-md bg-ds-warning/10 border border-ds-warning/30 text-sm text-ds-warning">
                <span className="font-medium">Insufficient credits.</span> You need{' '}
                {creditsRequired - userCredits} more credits to submit this request.
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onMakeChanges}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Make Changes
              </Button>
              <Button
                size="sm"
                onClick={onSubmit}
                disabled={isLoading}
                className="gap-1.5 bg-crafted-green hover:bg-crafted-forest"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : <Sparkles className="h-3.5 w-3.5" />}
                {hasEnoughCredits ? 'Review & Submit' : 'Buy Credits'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
