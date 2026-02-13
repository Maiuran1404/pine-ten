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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading'
import { Coins, Sparkles, Zap } from 'lucide-react'
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
    discount: '5% OFF',
  },
  {
    id: 'credits_500',
    name: 'Business',
    credits: 500,
    price: 2205,
    pricePerCredit: 4.41,
    originalPrice: 2450,
    discount: '10% OFF',
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

  // Find recommended package (smallest that covers the need)
  const recommendedPackage =
    creditPackages.find((pkg) => pkg.credits >= creditsNeeded) ||
    creditPackages[creditPackages.length - 1]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override sidebar offset to always center on viewport */}
      <DialogContent className="sm:max-w-[500px] left-1/2! -translate-x-1/2!">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            {creditsNeeded > 0 ? (
              <>
                You need{' '}
                <span className="font-semibold text-foreground">{creditsNeeded} more credits</span>{' '}
                to submit this task. Your current balance is {currentCredits} credits.
              </>
            ) : (
              'Select a credit package to continue creating design tasks.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {creditPackages.map((pkg) => {
            const isRecommended = pkg.id === recommendedPackage.id && creditsNeeded > 0

            return (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:border-primary',
                  isRecommended && 'border-primary bg-primary/5',
                  pkg.popular && !isRecommended && 'border-muted-foreground/30'
                )}
                onClick={() => !isLoading && handlePurchase(pkg.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full',
                      isRecommended ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {isRecommended ? <Zap className="h-5 w-5" /> : <Coins className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pkg.credits} credits</span>
                      {pkg.popular && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {pkg.discount && (
                        <Badge
                          variant="outline"
                          className="text-xs text-green-600 border-green-600"
                        >
                          {pkg.discount}
                        </Badge>
                      )}
                      {isRecommended && <Badge className="text-xs">Recommended</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${pkg.pricePerCredit.toFixed(2)}/credit
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {pkg.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      ${pkg.originalPrice}
                    </span>
                  )}
                  <Button
                    variant={isRecommended ? 'default' : 'outline'}
                    size="sm"
                    disabled={isLoading !== null}
                    className="cursor-pointer"
                  >
                    {isLoading === pkg.id ? <LoadingSpinner size="sm" /> : `$${pkg.price}`}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Stripe. Credits never expire.
        </p>
      </DialogContent>
    </Dialog>
  )
}
