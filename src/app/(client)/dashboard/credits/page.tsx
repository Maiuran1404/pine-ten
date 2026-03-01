'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCredits } from '@/providers/credit-provider'
import { useCsrfContext } from '@/providers/csrf-provider'
import { Check, Coins, Sparkles, RefreshCw, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

const creditPackages = [
  {
    id: 'credits_50',
    name: 'Starter',
    credits: 50,
    price: 245,
    pricePerCredit: 4.9,
    description: '5 social media designs or 1 ad campaign',
  },
  {
    id: 'credits_100',
    name: 'Standard',
    credits: 100,
    price: 490,
    pricePerCredit: 4.9,
    description: '10 designs or 3 video ads',
    popular: true,
  },
  {
    id: 'credits_250',
    name: 'Professional',
    credits: 250,
    price: 1164,
    pricePerCredit: 4.66,
    originalPrice: 1225,
    description: 'A month of content',
    savings: 5,
  },
  {
    id: 'credits_500',
    name: 'Business',
    credits: 500,
    price: 2205,
    pricePerCredit: 4.41,
    originalPrice: 2450,
    description: 'Full brand refresh',
    savings: 10,
  },
]

const creditExamples = [
  {
    credits: 50,
    items: [
      '5 social media posts with variants',
      '1 complete ad campaign (5 concepts)',
      '1 simple landing page design',
    ],
  },
  {
    credits: 100,
    items: [
      '10 social media designs',
      '3 animated video ads',
      '2 landing pages or 1 small website',
    ],
  },
  {
    credits: 250,
    items: [
      'A full month of social content',
      'Complete multi-platform ad campaign',
      'Medium-sized app or website design',
    ],
  },
  {
    credits: 500,
    items: [
      'Full brand refresh with all assets',
      'Quarterly content calendar',
      'Complete app design with all screens',
    ],
  },
]

const includedFeatures = [
  'Professional design by vetted freelancers',
  'Up to 2 revisions per task',
  'Source files included (PSD, AI, Figma)',
  'Commercial usage rights',
  'Fast turnaround times',
  'Direct communication with designers',
]

export default function CreditsPage() {
  const { credits: currentCredits } = useCredits()
  const { csrfFetch } = useCsrfContext()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handlePurchase = async (packageId: string) => {
    setIsLoading(packageId)

    try {
      const response = await csrfFetch('/api/webhooks/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe checkout
      window.location.href = data.data?.url
    } catch {
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="relative min-h-full bg-background">
      {/* Ambient gradient — curtain light effect */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background: `radial-gradient(ellipse at center, var(--crafted-green), transparent 70%)`,
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Credits</h1>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-crafted-green" />
              <span className="text-sm font-semibold text-foreground">{currentCredits}</span>
              <span className="text-sm text-muted-foreground">available</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-4 space-y-6 sm:space-y-8">
        {/* Low-balance warning */}
        {currentCredits <= 20 && (
          <div className="flex items-center gap-3 rounded-xl border border-ds-error/30 bg-ds-error/5 px-4 py-3">
            <Coins className="h-4 w-4 text-ds-error shrink-0" />
            <p className="text-sm text-ds-error">
              Your balance is low. Purchase more credits to continue creating tasks.
            </p>
          </div>
        )}

        {/* Credit Packages */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Purchase Credits</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'relative rounded-2xl border bg-card transition-all duration-200',
                  pkg.popular
                    ? 'border-crafted-green shadow-[0_0_24px_-6px] shadow-crafted-green/20'
                    : 'border-border hover:border-border/80 hover:shadow-md'
                )}
              >
                {/* Popular accent bar */}
                {pkg.popular && (
                  <div className="absolute top-0 left-4 right-4 h-px bg-crafted-green" />
                )}

                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-crafted-green text-white font-medium">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </span>
                  </div>
                )}

                {'savings' in pkg && pkg.savings && (
                  <div className="absolute -top-3 right-4 z-10">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-crafted-green/10 text-crafted-green font-medium border border-crafted-green/20">
                      Save {pkg.savings}%
                    </span>
                  </div>
                )}

                <div className="p-5 pt-6">
                  <h3 className="text-foreground font-medium">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>

                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{pkg.credits}</span>
                      <span className="text-muted-foreground">credits</span>
                    </div>
                    <div className="mt-1">
                      {pkg.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through mr-2">
                          ${formatPrice(pkg.originalPrice)}
                        </span>
                      )}
                      <span className="text-lg font-semibold text-foreground">
                        ${formatPrice(pkg.price)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${pkg.pricePerCredit.toFixed(2)} per credit
                    </p>
                  </div>

                  <Button
                    className={cn(
                      'w-full mt-4',
                      pkg.popular && 'bg-crafted-green hover:bg-crafted-forest text-white'
                    )}
                    variant={pkg.popular ? 'default' : 'outline'}
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={isLoading !== null}
                  >
                    {isLoading === pkg.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What Credits Get You — 4-column open grid */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            What Your Credits Get You
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {creditExamples.map((example) => (
              <div key={example.credits} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl font-bold text-crafted-green">{example.credits}</span>
                  <span className="text-sm text-muted-foreground">credits</span>
                </div>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {example.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Every Task Includes — 3-column flat grid */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Every Task Includes</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {includedFeatures.map((item) => (
              <div key={item} className="flex items-center gap-3 text-foreground">
                <Check className="h-4 w-4 text-crafted-green shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Secure payments powered by Stripe. Credits never expire.</span>
        </div>
      </div>
    </div>
  )
}
