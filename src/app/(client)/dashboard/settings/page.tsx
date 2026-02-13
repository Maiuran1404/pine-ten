'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
        return <ArrowDownRight className="h-4 w-4 text-emerald-500" />
      case 'USAGE':
        return <ArrowUpRight className="h-4 w-4 text-rose-500" />
      case 'REFUND':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />
      case 'BONUS':
        return <ArrowDownRight className="h-4 w-4 text-amber-500" />
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatTransactionAmount = (amount: number, type: string) => {
    const isPositive = type === 'PURCHASE' || type === 'REFUND' || type === 'BONUS'
    return (
      <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
        {isPositive ? '+' : '-'}
        {Math.abs(amount)} credits
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <Skeleton className="h-7 w-32" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
          <Skeleton className="h-10 w-64" />
          <SettingsCard className="p-6">
            <Skeleton className="h-32 w-full" />
          </SettingsCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Account</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-4 sm:space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto flex overflow-x-auto">
            <TabsTrigger
              value="profile"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
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
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
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
                            ? 'text-rose-500'
                            : (billingData?.credits ?? 0) <= 2
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                        )}
                      >
                        {billingData?.credits ?? 0}
                      </span>
                      <span className="text-muted-foreground">credits available</span>
                    </div>
                    {(billingData?.credits ?? 0) <= 2 && (
                      <p className="text-sm text-amber-500 mt-2">
                        Your balance is low. Purchase more credits to continue creating tasks.
                      </p>
                    )}
                  </div>
                  <Button asChild>
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
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
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
                  <div className="p-8 text-center">
                    <Coins className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
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
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <AccountInfoSection userSettings={userSettings} />

            {/* Logout */}
            <SessionSection isLoggingOut={isLoggingOut} onLogout={handleLogout} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
