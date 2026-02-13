'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession, signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  LogOut,
  CreditCard,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserSettings {
  id: string
  name: string
  email: string
  phone: string | null
  image: string | null
  createdAt: string
}

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

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-xl border border-border bg-card', className)}>{children}</div>
)

const CardHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) => (
  <div className="p-5 border-b border-border">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
    </div>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </div>
)

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, billingRes] = await Promise.all([
        fetch('/api/user/settings'),
        fetch('/api/user/billing'),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setUserSettings(data.user)
        setFormData({
          name: data.user.name || '',
          phone: data.user.phone || '',
        })
      }

      if (billingRes.ok) {
        const data = await billingRes.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
        }),
      })

      if (response.ok) {
        toast.success('Profile updated successfully')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch {
      toast.error('Failed to log out')
      setIsLoggingOut(false)
    }
  }

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

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
          <Card className="p-6">
            <Skeleton className="h-32 w-full" />
          </Card>
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
            <Card>
              <CardHeader
                icon={User}
                title="Profile Information"
                description="Update your personal details"
              />
              <div className="p-5 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{session?.user?.name}</p>
                    <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="grid gap-4 max-w-md">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      value={userSettings?.email || ''}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code. We&apos;ll send task updates via WhatsApp.
                    </p>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Credit Balance */}
            <Card>
              <CardHeader
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
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader
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
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader
                icon={Calendar}
                title="Account Information"
                description="Your account details"
              />
              <div className="p-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account ID</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {userSettings?.id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="text-foreground">
                      {userSettings?.createdAt
                        ? new Date(userSettings.createdAt).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Logout */}
            <Card>
              <CardHeader icon={LogOut} title="Session" description="Manage your current session" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Log out of your account</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You will need to sign in again to access your dashboard
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
