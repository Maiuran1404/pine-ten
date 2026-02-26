'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Coins } from 'lucide-react'

interface ApproveButtonProps {
  creditsCost: number
  userCredits: number
  onApprove: () => void
  isApproving?: boolean
  disabled?: boolean
}

export function ApproveButton({
  creditsCost,
  userCredits,
  onApprove,
  isApproving,
  disabled,
}: ApproveButtonProps) {
  const hasEnoughCredits = userCredits >= creditsCost

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Project Cost</span>
        <span className="font-semibold flex items-center gap-1">
          <Coins className="w-4 h-4 text-ds-success" />
          {creditsCost} credits
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Your Balance</span>
        <span
          className={`font-semibold ${hasEnoughCredits ? 'text-crafted-green' : 'text-ds-error'}`}
        >
          {userCredits} credits
        </span>
      </div>
      {!hasEnoughCredits && (
        <div className="space-y-1">
          <p className="text-xs text-ds-error">
            You need {creditsCost - userCredits} more credits to approve this project.
          </p>
          <Link
            href="/dashboard/credits"
            className="text-xs text-crafted-green hover:text-crafted-forest underline"
          >
            Purchase Credits
          </Link>
        </div>
      )}
      <Button
        onClick={onApprove}
        disabled={!hasEnoughCredits || isApproving || disabled}
        className="w-full bg-crafted-green hover:bg-crafted-forest text-white h-12 text-base"
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
