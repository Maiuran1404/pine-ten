'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Receipt,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Package,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RevenueData {
  overview: {
    totalRevenue: number
    totalCreditsPurchased: number
    pricePerCredit: number
    currency: string
    uniquePayingCustomers: number
    averageOrderValue: number
  }
  periodRevenue: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  transactionSummary: {
    purchases: { count: number; totalCredits: number; revenue: number }
    usage: { count: number; totalCredits: number }
    bonuses: { count: number; totalCredits: number }
    refunds: { count: number; totalCredits: number }
  }
  monthlyRevenue: Array<{
    month: string
    credits: number
    revenue: number
    transactionCount: number
  }>
  topCustomers: Array<{
    userId: string
    name: string
    email: string
    totalCredits: number
    totalRevenue: number
    transactionCount: number
  }>
  packageDistribution: Array<{
    credits: number
    packageName: string
    count: number
    revenue: number
  }>
  recentTransactions: Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    credits: number
    revenue: number
    type: string
    description: string
    stripePaymentId: string | null
    createdAt: string
  }>
  stripe: {
    balance: {
      available: Array<{ amount: number; currency: string }>
      pending: Array<{ amount: number; currency: string }>
    } | null
    recentCharges: Array<{
      id: string
      amount: number
      currency: string
      status: string
      created: number
      customerEmail: string | null
      description: string | null
      receiptUrl: string | null
    }>
    recentPayouts: Array<{
      id: string
      amount: number
      currency: string
      status: string
      created: number
      arrivalDate: number
    }>
  }
  webhookEvents: Array<{
    id: string
    eventId: string
    eventType: string
    status: string
    processedAt: string
    errorMessage: string | null
  }>
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    fetchRevenue()
  }, [period])

  const fetchRevenue = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/revenue?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch revenue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'processed':
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>
      case 'pending':
      case 'in_transit':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
        )
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load revenue data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground">Comprehensive billing and payment analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchRevenue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.totalCreditsPurchased} credits @ ${data.overview.pricePerCredit}/credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.periodRevenue.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Today: {formatCurrency(data.periodRevenue.today)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.uniquePayingCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Avg. order: {formatCurrency(data.overview.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.transactionSummary.purchases.count}</div>
            <p className="text-xs text-muted-foreground">
              {data.transactionSummary.purchases.totalCredits} credits sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Balance */}
      {data.stripe.balance && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stripe Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data.stripe.balance.available.map((b, i) => (
                  <span key={i}>
                    {formatCurrency(b.amount / 100)}
                    {i < data.stripe.balance!.available.length - 1 && ', '}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stripe Pending Balance</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {data.stripe.balance.pending.map((b, i) => (
                  <span key={i}>
                    {formatCurrency(b.amount / 100)}
                    {i < data.stripe.balance!.pending.length - 1 && ', '}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="stripe">Stripe Payments</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="packages">Package Sales</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        {/* Recent Transactions */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Recent Credit Purchases
              </CardTitle>
              <CardDescription>
                {data.recentTransactions.length} most recent purchase transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Stripe ID</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.userName || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{tx.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            +{tx.credits}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(tx.revenue)}
                        </TableCell>
                        <TableCell>
                          {tx.stripePaymentId ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {tx.stripePaymentId.slice(0, 20)}...
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Transaction Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{data.transactionSummary.purchases.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.transactionSummary.purchases.revenue)} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-blue-500" />
                  Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{data.transactionSummary.usage.count}</div>
                <p className="text-xs text-muted-foreground">
                  {data.transactionSummary.usage.totalCredits} credits used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="h-4 w-4 text-purple-500" />
                  Bonuses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{data.transactionSummary.bonuses.count}</div>
                <p className="text-xs text-muted-foreground">
                  {data.transactionSummary.bonuses.totalCredits} credits granted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-orange-500" />
                  Refunds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{data.transactionSummary.refunds.count}</div>
                <p className="text-xs text-muted-foreground">
                  {data.transactionSummary.refunds.totalCredits} credits refunded
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stripe Payments */}
        <TabsContent value="stripe">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Charges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recent Stripe Charges
                </CardTitle>
                <CardDescription>Latest payment charges from Stripe</CardDescription>
              </CardHeader>
              <CardContent>
                {data.stripe.recentCharges.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No charges found</p>
                ) : (
                  <div className="space-y-3">
                    {data.stripe.recentCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{formatCurrency(charge.amount / 100)}</p>
                            {getStatusBadge(charge.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {charge.customerEmail || 'No email'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(charge.created)}
                          </p>
                        </div>
                        {charge.receiptUrl && (
                          <a
                            href={charge.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Payouts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Recent Payouts
                </CardTitle>
                <CardDescription>Bank transfers from Stripe</CardDescription>
              </CardHeader>
              <CardContent>
                {data.stripe.recentPayouts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No payouts yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.stripe.recentPayouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{formatCurrency(payout.amount / 100)}</p>
                            {getStatusBadge(payout.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created: {formatTimestamp(payout.created)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Arrival: {formatTimestamp(payout.arrivalDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Customers */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Customers by Revenue
              </CardTitle>
              <CardDescription>Customers ranked by total credit purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topCustomers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No customers yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Credits</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Purchases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topCustomers.map((customer, index) => (
                      <TableRow key={customer.userId}>
                        <TableCell>
                          <span className={`font-bold ${index < 3 ? 'text-yellow-500' : ''}`}>
                            #{index + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{customer.totalCredits}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(customer.totalRevenue)}
                        </TableCell>
                        <TableCell>{customer.transactionCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Package Sales */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Credit Package Distribution
              </CardTitle>
              <CardDescription>Breakdown of sales by credit package size</CardDescription>
            </CardHeader>
            <CardContent>
              {data.packageDistribution.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No package sales yet</p>
              ) : (
                <div className="space-y-4">
                  {data.packageDistribution.map((pkg) => {
                    const totalSales = data.packageDistribution.reduce((sum, p) => sum + p.count, 0)
                    const percentage = totalSales > 0 ? (pkg.count / totalSales) * 100 : 0

                    return (
                      <div key={pkg.credits} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{pkg.packageName}</Badge>
                            <span className="text-sm text-muted-foreground">{pkg.count} sales</span>
                          </div>
                          <span className="font-medium text-green-600">
                            {formatCurrency(pkg.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          {percentage.toFixed(1)}% of sales
                        </p>
                      </div>
                    )
                  })}

                  <div className="pt-4 border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Package</TableHead>
                          <TableHead>Units Sold</TableHead>
                          <TableHead>Total Credits</TableHead>
                          <TableHead>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.packageDistribution.map((pkg) => (
                          <TableRow key={pkg.credits}>
                            <TableCell className="font-medium">{pkg.packageName}</TableCell>
                            <TableCell>{pkg.count}</TableCell>
                            <TableCell>{pkg.credits * pkg.count}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(pkg.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Trend */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Revenue Trend
              </CardTitle>
              <CardDescription>Revenue breakdown by month (last 12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthlyRevenue.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No monthly data yet</p>
              ) : (
                <div className="space-y-4">
                  {/* Visual bars */}
                  <div className="space-y-3">
                    {data.monthlyRevenue.slice(0, 6).map((month) => {
                      const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue))
                      const percentage = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0

                      return (
                        <div key={month.month} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{month.month}</span>
                            <span className="text-green-600">{formatCurrency(month.revenue)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-primary to-primary/60 h-3 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {month.credits} credits from {month.transactionCount} transactions
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Full table */}
                  <div className="pt-4 border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Credits Sold</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.monthlyRevenue.map((month) => (
                          <TableRow key={month.month}>
                            <TableCell className="font-medium">{month.month}</TableCell>
                            <TableCell>{month.credits}</TableCell>
                            <TableCell>{month.transactionCount}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(month.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Stripe Webhook Events
              </CardTitle>
              <CardDescription>Recent webhook events for debugging</CardDescription>
            </CardHeader>
            <CardContent>
              {data.webhookEvents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No webhook events recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.webhookEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {event.eventType}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">
                            {event.eventId.slice(0, 20)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {event.status === 'processed' ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Processed</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Failed</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(event.processedAt)}
                        </TableCell>
                        <TableCell>
                          {event.errorMessage ? (
                            <span className="text-sm text-red-500">{event.errorMessage}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
