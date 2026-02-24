'use client'

import { Button } from '@/components/ui/button'
import { Check, Loader2, Coins } from 'lucide-react'

interface ApproveButtonProps {
  creditsCost: number
  userCredits: number
  onApprove: () => void
  isApproving?: boolean
}

export function ApproveButton({
  creditsCost,
  userCredits,
  onApprove,
  isApproving,
}: ApproveButtonProps) {
  const hasEnoughCredits = userCredits >= creditsCost

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Project Cost</span>
        <span className="font-semibold flex items-center gap-1">
          <Coins className="w-4 h-4 text-green-500" />
          {creditsCost} credits
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Your Balance</span>
        <span className={`font-semibold ${hasEnoughCredits ? 'text-green-600' : 'text-red-500'}`}>
          {userCredits} credits
        </span>
      </div>
      {!hasEnoughCredits && (
        <p className="text-xs text-red-500">
          You need {creditsCost - userCredits} more credits to approve this project.
        </p>
      )}
      <Button
        onClick={onApprove}
        disabled={!hasEnoughCredits || isApproving}
        className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
      >
        {isApproving ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Check className="w-4 h-4 mr-2" />
        )}
        Approve & Start Project
      </Button>
    </div>
  )
}
