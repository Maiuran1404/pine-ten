'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/loading'
import { Check, Lock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

const creditPackages = [
  {
    id: 'credits_50',
    name: 'Starter',
    credits: 50,
    price: 245,
    pricePerCredit: 4.9,
  },
  {
    id: 'credits_100',
    name: 'Standard',
    credits: 100,
    price: 490,
    pricePerCredit: 4.9,
    popular: true,
  },
  {
    id: 'credits_250',
    name: 'Professional',
    credits: 250,
    price: 1164,
    pricePerCredit: 4.66,
    originalPrice: 1225,
    discount: 5,
  },
  {
    id: 'credits_500',
    name: 'Business',
    credits: 500,
    price: 2205,
    pricePerCredit: 4.41,
    originalPrice: 2450,
    discount: 10,
  },
]

interface PendingTaskState {
  taskProposal: unknown
  draftId?: string
}

interface CreditPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requiredCredits?: number
  currentCredits?: number
  /** URL to return to after payment (defaults to current page) */
  returnUrl?: string
  /** Pending task state to restore after payment */
  pendingTaskState?: PendingTaskState
  /** If true, fetches current credits from API when dialog opens */
  fetchCredits?: boolean
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  requiredCredits = 0,
  currentCredits: initialCredits,
  returnUrl,
  pendingTaskState,
  fetchCredits: shouldFetchCredits = false,
}: CreditPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [credits, setCredits] = useState(initialCredits ?? 0)

  // Fetch credits from API if needed
  useEffect(() => {
    if (open && shouldFetchCredits && initialCredits === undefined) {
      const fetchCreditsFromApi = async () => {
        try {
          const response = await fetch('/api/user/credits')
          if (response.ok) {
            const data = await response.json()
            setCredits(data.credits)
          }
        } catch (error) {
          logger.error({ err: error }, 'Failed to fetch credits')
        }
      }
      fetchCreditsFromApi()
    }
  }, [open, shouldFetchCredits, initialCredits])

  // Update local state when prop changes
  useEffect(() => {
    if (initialCredits !== undefined) {
      setCredits(initialCredits)
    }
  }, [initialCredits])

  const currentCredits = credits
  const creditsNeeded = Math.max(0, requiredCredits - currentCredits)

  // Find recommended package (smallest that covers the need)
  const recommendedPackage =
    creditPackages.find((pkg) => pkg.credits >= creditsNeeded) ||
    creditPackages[creditPackages.length - 1]

  // Auto-select recommended when dialog opens
  useEffect(() => {
    if (open && creditsNeeded > 0) {
      setSelectedPkg(recommendedPackage.id)
    } else if (open) {
      setSelectedPkg(creditPackages[0].id)
    }
  }, [open, creditsNeeded, recommendedPackage.id])

  const handlePurchase = async (packageId: string) => {
    setIsLoading(packageId)

    try {
      // Save pending task state to sessionStorage so we can restore it after payment
      if (pendingTaskState) {
        sessionStorage.setItem('pending_task_state', JSON.stringify(pendingTaskState))
      }

      // Get current URL INCLUDING query params (like draft ID) to return to after payment
      // This ensures the user returns to the same draft context
      const currentPath = returnUrl || window.location.pathname + window.location.search

      const response = await fetch('/api/webhooks/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, returnUrl: currentPath }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch {
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const activePkg = creditPackages.find((p) => p.id === selectedPkg) ?? creditPackages[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override sidebar offset to always center on viewport */}
      <DialogContent className="sm:max-w-[440px] left-1/2! -translate-x-1/2! gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold tracking-tight">Get credits</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {creditsNeeded > 0 ? (
                <>
                  You need <span className="font-medium text-foreground">{creditsNeeded} more</span>{' '}
                  to submit. Balance: {currentCredits} credits.
                </>
              ) : (
                'Choose a package to keep creating.'
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Package options */}
        <div className="px-6 pb-2 space-y-2">
          {creditPackages.map((pkg) => {
            const isRecommended = pkg.id === recommendedPackage.id && creditsNeeded > 0
            const isSelected = selectedPkg === pkg.id

            return (
              <button
                key={pkg.id}
                type="button"
                disabled={isLoading !== null}
                onClick={() => setSelectedPkg(pkg.id)}
                className={cn(
                  'relative w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all text-left',
                  'hover:border-crafted-green/40',
                  isSelected
                    ? 'border-crafted-green bg-crafted-green/[0.04] dark:bg-crafted-green/[0.08]'
                    : 'border-border/60 bg-transparent'
                )}
              >
                {/* Left: radio + info */}
                <div className="flex items-center gap-3.5">
                  {/* Custom radio */}
                  <div
                    className={cn(
                      'w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'border-crafted-green bg-crafted-green'
                        : 'border-muted-foreground/25'
                    )}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {pkg.credits} credits
                      </span>
                      {isRecommended && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-crafted-green">
                          Best fit
                        </span>
                      )}
                      {pkg.popular && !isRecommended && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${pkg.pricePerCredit.toFixed(2)} per credit
                      {pkg.discount ? (
                        <span className="ml-1.5 text-crafted-green font-medium">
                          {pkg.discount}% off
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                {/* Right: price */}
                <div className="text-right shrink-0">
                  {pkg.originalPrice && (
                    <span className="text-xs text-muted-foreground/50 line-through mr-1.5">
                      ${pkg.originalPrice}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">${pkg.price}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* CTA + footer */}
        <div className="px-6 pt-4 pb-5 space-y-3">
          <button
            type="button"
            disabled={isLoading !== null || !selectedPkg}
            onClick={() => selectedPkg && handlePurchase(selectedPkg)}
            className={cn(
              'w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all',
              'bg-crafted-green hover:bg-crafted-green-light text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Continue to payment
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/50">
            <Lock className="h-3 w-3" />
            <span>
              Secured by Stripe &middot; ${activePkg.price} for {activePkg.credits} credits
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
