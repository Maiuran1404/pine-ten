'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import {
  User,
  Calendar,
  CreditCard,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/use-settings'
import { SettingsCard, SettingsCardHeader } from '@/components/settings/settings-card'
import { ProfileSection } from '@/components/settings/profile-section'
import { AccountInfoSection } from '@/components/settings/account-info-section'
import { SessionSection } from '@/components/settings/session-section'

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: string
}

interface BillingData {
  credits: number
  transactions: Transaction[]
}

type SettingsTab = 'profile' | 'billing' | 'account'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'account', label: 'Account', icon: Calendar },
]

function SettingsTabNav({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}) {
  return (
    <div className="flex justify-center">
      <nav className="inline-flex gap-0.5">
        {SETTINGS_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-crafted-green/15 text-crafted-forest dark:text-crafted-sage'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const {
    isLoading,
    isSaving,
    isLoggingOut,
    userSettings,
    formData,
    setFormData,
    handleSaveProfile,
    handleLogout,
    getInitials,
  } = useSettings()
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'account'>('profile')
  const [billingData, setBillingData] = useState<BillingData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadBillingData() {
      try {
        const billingRes = await fetch('/api/user/billing')
        if (billingRes.ok && !cancelled) {
          const { data } = await billingRes.json()
          setBillingData(data)
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error)
      }
    }
    loadBillingData()
    return () => {
      cancelled = true
    }
  }, [])

  const initials = getInitials(session?.user?.name)

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ArrowDownRight className="h-4 w-4 text-ds-success" />
      case 'USAGE':
        return <ArrowUpRight className="h-4 w-4 text-ds-error" />
      case 'REFUND':
        return <ArrowDownRight className="h-4 w-4 text-ds-info" />
      case 'BONUS':
        return <ArrowDownRight className="h-4 w-4 text-ds-warning" />
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatTransactionAmount = (amount: number, type: string) => {
    const isPositive = type === 'PURCHASE' || type === 'REFUND' || type === 'BONUS'
    return (
      <span className={isPositive ? 'text-ds-success' : 'text-ds-error'}>
        {isPositive ? '+' : '-'}
        {Math.abs(amount)} credits
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
          <Skeleton className="h-11 w-72" />
          <SettingsCard className="p-6">
            <Skeleton className="h-40 w-full" />
          </SettingsCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Account</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">
        {/* Tab Navigation */}
        <SettingsTabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <ProfileSection
              session={session}
              initials={initials}
              formData={formData}
              setFormData={setFormData}
              isSaving={isSaving}
              onSave={handleSaveProfile}
              emailValue={userSettings?.email || ''}
              phoneLabel="WhatsApp Number"
              phoneIcon={MessageCircle}
              phonePlaceholder="+1 234 567 8900"
              phoneHint="Include country code. We'll send task updates via WhatsApp."
            />
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Credit Balance */}
            <SettingsCard>
              <SettingsCardHeader
                icon={Coins}
                title="Credit Balance"
                description="Your current credit balance for creating tasks"
              />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          'text-4xl font-bold',
                          billingData?.credits === 0
                            ? 'text-ds-error'
                            : (billingData?.credits ?? 0) <= 2
                              ? 'text-ds-warning'
                              : 'text-ds-success'
                        )}
                      >
                        {billingData?.credits ?? 0}
                      </span>
                      <span className="text-muted-foreground">credits available</span>
                    </div>
                    {(billingData?.credits ?? 0) <= 2 && (
                      <p className="text-sm text-ds-warning mt-2">
                        Your balance is low. Purchase more credits to continue creating tasks.
                      </p>
                    )}
                  </div>
                  <Button asChild className="bg-crafted-green hover:bg-crafted-forest text-white">
                    <Link href="/dashboard/credits">
                      <Plus className="h-4 w-4 mr-2" />
                      Buy Credits
                    </Link>
                  </Button>
                </div>
              </div>
            </SettingsCard>

            {/* Transaction History */}
            <SettingsCard>
              <SettingsCardHeader
                icon={CreditCard}
                title="Transaction History"
                description="Your recent credit transactions"
              />
              <div className="divide-y divide-border">
                {billingData?.transactions && billingData.transactions.length > 0 ? (
                  billingData.transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {transaction.description || transaction.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatTransactionAmount(transaction.amount, transaction.type)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Coins className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No transactions yet</p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link href="/dashboard/credits">
                        Purchase your first credits
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SettingsCard>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <AccountInfoSection userSettings={userSettings} />
            <SessionSection isLoggingOut={isLoggingOut} onLogout={handleLogout} />
          </div>
        )}
      </div>
    </div>
  )
}
