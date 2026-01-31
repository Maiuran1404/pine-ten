"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Wallet,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  DollarSign,
  AlertCircle,
  Info,
  CreditCard,
  Building2,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface PayoutStats {
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  pendingTasksCount: number;
  totalPaidOut: number;
  pendingPayouts: number;
}

interface EarningsEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  credits: number;
  completedAt: string;
  status: "available" | "pending";
}

interface PayoutHistoryEntry {
  id: string;
  amount: number;
  netAmountUsd: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  method: string;
  requestedAt: string;
  completedAt: string | null;
  failureReason?: string | null;
}

interface MonthlyEarning {
  month: string;
  year: number;
  credits: number;
  tasksCompleted: number;
}

interface StripeConnectStatus {
  connected: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  externalAccountLast4?: string;
}

interface PayoutConfig {
  minimumPayoutCredits: number;
  artistPercentage: number;
  holdingPeriodDays: number;
  creditValueUsd: number;
}

export default function PayoutsPage() {
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryEntry[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarning[]>([]);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("earnings");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();

  const fetchPayoutData = useCallback(async () => {
    try {
      const res = await fetch("/api/freelancer/payouts");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setEarnings(data.earnings || []);
        setPayoutHistory(data.payoutHistory || []);
        setMonthlyEarnings(data.monthlyEarnings || []);
        setStripeConnectStatus(data.stripeConnectStatus);
        setPayoutConfig(data.payoutConfig);
      }
    } catch (error) {
      console.error("Failed to fetch payout data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayoutData();
  }, [fetchPayoutData]);

  // Handle Stripe Connect return params
  useEffect(() => {
    const stripeOnboarded = searchParams.get("stripe_onboarded");
    const stripeRefresh = searchParams.get("stripe_refresh");

    if (stripeOnboarded === "true") {
      toast.success("Stripe account connected successfully!");
      fetchPayoutData();
      router.replace("/portal/payouts");
    } else if (stripeRefresh === "true") {
      toast.info("Please complete your Stripe onboarding to enable payouts.");
      router.replace("/portal/payouts");
    }
  }, [searchParams, router, fetchPayoutData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Convert credits to USD based on config
  const creditsToCurrency = (credits: number) => {
    const valuePerCredit = payoutConfig?.creditValueUsd || 3.43;
    return (credits * valuePerCredit).toFixed(2);
  };

  // Handle Stripe Connect setup
  const handleConnectStripe = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/freelancer/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", country: "US" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.onboardingUrl) {
          window.location.href = data.onboardingUrl;
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to connect Stripe");
      }
    } catch (error) {
      console.error("Stripe connect error:", error);
      toast.error("Failed to start Stripe onboarding");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle continue onboarding
  const handleContinueOnboarding = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/freelancer/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "onboarding" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.onboardingUrl) {
          window.location.href = data.onboardingUrl;
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to get onboarding link");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to continue onboarding");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Stripe dashboard link
  const handleOpenDashboard = async () => {
    try {
      const res = await fetch("/api/freelancer/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dashboard" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.dashboardUrl) {
          window.open(data.dashboardUrl, "_blank");
        }
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to open dashboard");
      }
    } catch (error) {
      console.error("Dashboard error:", error);
      toast.error("Failed to open Stripe dashboard");
    }
  };

  // Handle payout request
  const handleRequestPayout = async () => {
    const amount = parseInt(payoutAmount);
    if (!amount || amount < (payoutConfig?.minimumPayoutCredits || 10)) {
      toast.error(`Minimum payout is ${payoutConfig?.minimumPayoutCredits || 10} credits`);
      return;
    }

    if (amount > (stats?.availableBalance || 0)) {
      toast.error("Insufficient available balance");
      return;
    }

    setIsRequestingPayout(true);
    try {
      const res = await fetch("/api/freelancer/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditsAmount: amount }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Payout of $${data.netAmountUsd.toFixed(2)} initiated successfully!`);
        setPayoutDialogOpen(false);
        setPayoutAmount("");
        fetchPayoutData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to request payout");
      }
    } catch (error) {
      console.error("Payout request error:", error);
      toast.error("Failed to process payout request");
    } finally {
      setIsRequestingPayout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-0">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const availableForPayout = stats?.availableBalance || 0;
  const minimumPayout = payoutConfig?.minimumPayoutCredits || 10;
  const canRequestPayout =
    availableForPayout >= minimumPayout &&
    stripeConnectStatus?.connected &&
    stripeConnectStatus?.payoutsEnabled;

  return (
    <div className="space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Payouts
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Track your earnings and request payouts
          </p>
        </div>
        <Button
          size="lg"
          disabled={!canRequestPayout}
          onClick={() => setPayoutDialogOpen(true)}
          className="gap-2"
        >
          <Wallet className="h-4 w-4" />
          Request Payout
          {!canRequestPayout && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-1" />
                </TooltipTrigger>
                <TooltipContent>
                  {!stripeConnectStatus?.connected ? (
                    <p>Connect your Stripe account first</p>
                  ) : !stripeConnectStatus?.payoutsEnabled ? (
                    <p>Complete Stripe onboarding to enable payouts</p>
                  ) : (
                    <p>Minimum {minimumPayout} credits required for payout</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Button>
      </div>

      {/* Stripe Connect Banner - if not connected */}
      {(!stripeConnectStatus?.connected || !stripeConnectStatus?.payoutsEnabled) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    {!stripeConnectStatus?.connected
                      ? "Connect your Stripe account to receive payouts"
                      : "Complete your Stripe onboarding"}
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                    {!stripeConnectStatus?.connected
                      ? `Set up Stripe Express to receive ${payoutConfig?.artistPercentage || 70}% of your earnings directly to your bank account.`
                      : "Finish setting up your Stripe account to start receiving payouts."}
                  </p>
                </div>
              </div>
              <Button
                onClick={!stripeConnectStatus?.connected ? handleConnectStripe : handleContinueOnboarding}
                disabled={isConnecting}
                className="shrink-0"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    {!stripeConnectStatus?.connected ? "Connect Stripe" : "Continue Setup"}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Available Balance */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Available Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">
                {stats?.availableBalance || 0}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${creditsToCurrency(stats?.availableBalance || 0)}
            </p>
            {!canRequestPayout && availableForPayout > 0 && availableForPayout < minimumPayout && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {minimumPayout - availableForPayout} more credits needed for payout
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">
                {stats?.pendingBalance || 0}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${creditsToCurrency(stats?.pendingBalance || 0)}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 cursor-help">
                    <Info className="h-3 w-3" />
                    {stats?.pendingTasksCount || 0} tasks in review + {payoutConfig?.holdingPeriodDays || 7}-day hold
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Credits become available {payoutConfig?.holdingPeriodDays || 7} days after task completion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Lifetime Earnings */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Total Paid Out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">
                {stats?.totalPaidOut || 0}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${creditsToCurrency(stats?.totalPaidOut || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Lifetime: {stats?.lifetimeEarnings || 0} credits earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Monthly Overview</CardTitle>
              <CardDescription>Your earnings trend over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats?.thisMonthEarnings || 0}</span>
                <span className="text-muted-foreground">credits</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Last Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stats?.lastMonthEarnings || 0}</span>
                <span className="text-muted-foreground">credits</span>
              </div>
              {stats?.thisMonthEarnings !== undefined && stats?.lastMonthEarnings !== undefined && stats.lastMonthEarnings > 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  stats.thisMonthEarnings >= stats.lastMonthEarnings ? "text-green-600" : "text-red-600"
                }`}>
                  {stats.thisMonthEarnings >= stats.lastMonthEarnings ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 rotate-90" />
                  )}
                  {Math.abs(((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100).toFixed(0)}%
                  {stats.thisMonthEarnings >= stats.lastMonthEarnings ? " increase" : " decrease"}
                </p>
              )}
            </div>
          </div>

          {/* Monthly Earnings Chart/List */}
          {monthlyEarnings.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Earnings by Month</h4>
              <div className="space-y-2">
                {monthlyEarnings.slice(0, 6).map((entry, index) => (
                  <motion.div
                    key={`${entry.month}-${entry.year}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {entry.month} {entry.year}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{entry.credits} credits</span>
                      <p className="text-xs text-muted-foreground">
                        {entry.tasksCompleted} tasks
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Earnings & Payout History */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="earnings" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payout History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Earnings</CardTitle>
              <CardDescription>
                Credits earned from completed tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No earnings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete tasks to start earning credits
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earnings.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.taskTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(entry.completedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={entry.status === "available" ? "default" : "secondary"}
                          className="gap-1"
                        >
                          {entry.status === "available" ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {entry.status === "available" ? "Available" : "Pending"}
                        </Badge>
                        <span className="font-semibold whitespace-nowrap">
                          +{entry.credits} credits
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout History</CardTitle>
              <CardDescription>
                Your past payout requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No payouts yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Request your first payout when you have at least {minimumPayout} credits
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutHistory.map((payout, index) => (
                    <motion.div
                      key={payout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.status === "completed"
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                            : payout.status === "processing" || payout.status === "pending"
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30"
                        }`}>
                          {payout.status === "completed" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : payout.status === "processing" || payout.status === "pending" ? (
                            <Clock className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payout.amount} credits → ${payout.netAmountUsd.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.method.replace("_", " ")} • {formatDate(payout.requestedAt)}
                          </p>
                          {payout.failureReason && (
                            <p className="text-xs text-red-600 mt-0.5">{payout.failureReason}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          payout.status === "completed"
                            ? "default"
                            : payout.status === "processing" || payout.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Method Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            {stripeConnectStatus?.connected
              ? "Manage your Stripe Express account"
              : "Set up your payment method to receive payouts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripeConnectStatus?.connected ? (
            <div className="space-y-4">
              {/* Connected account info */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Stripe Connected</p>
                    {stripeConnectStatus.externalAccountLast4 && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Bank account ending in {stripeConnectStatus.externalAccountLast4}
                      </p>
                    )}
                  </div>
                </div>
                {stripeConnectStatus.payoutsEnabled ? (
                  <Badge variant="default" className="bg-green-600">Payouts Enabled</Badge>
                ) : (
                  <Badge variant="secondary">Setup Required</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!stripeConnectStatus.payoutsEnabled && (
                  <Button
                    variant="outline"
                    onClick={handleContinueOnboarding}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Complete Setup
                  </Button>
                )}
                {stripeConnectStatus.detailsSubmitted && (
                  <Button
                    variant="outline"
                    onClick={handleOpenDashboard}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Stripe Dashboard
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={handleConnectStripe}
              className="flex items-center justify-between p-4 rounded-lg border border-dashed hover:border-primary/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Connect Stripe Express</p>
                  <p className="text-sm text-muted-foreground">
                    Receive {payoutConfig?.artistPercentage || 70}% of your earnings directly to your bank
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Payouts typically arrive within 2-3 business days after processing
          </p>
        </CardContent>
      </Card>

      {/* Revenue Split Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            How Payouts Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Your Share</p>
              <p className="text-2xl font-bold text-green-600">{payoutConfig?.artistPercentage || 70}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                ${payoutConfig?.creditValueUsd?.toFixed(2) || "3.43"} per credit
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Holding Period</p>
              <p className="text-2xl font-bold">{payoutConfig?.holdingPeriodDays || 7} days</p>
              <p className="text-xs text-muted-foreground mt-1">
                After task completion
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Minimum Payout</p>
              <p className="text-2xl font-bold">{payoutConfig?.minimumPayoutCredits || 10} credits</p>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${creditsToCurrency(payoutConfig?.minimumPayoutCredits || 10)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Tax Documents
          </CardTitle>
          <CardDescription>
            Download your tax documents for reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">No tax documents available yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tax documents will be available at the end of the tax year
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Enter the amount of credits you want to withdraw.
              You&apos;ll receive {payoutConfig?.artistPercentage || 70}% of the credit value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Credits to withdraw</Label>
              <Input
                id="amount"
                type="number"
                placeholder={`Min: ${minimumPayout}`}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min={minimumPayout}
                max={stats?.availableBalance || 0}
              />
              <p className="text-sm text-muted-foreground">
                Available: {stats?.availableBalance || 0} credits
              </p>
            </div>
            {payoutAmount && parseInt(payoutAmount) >= minimumPayout && (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>Credits</span>
                  <span>{payoutAmount}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Your share ({payoutConfig?.artistPercentage || 70}%)</span>
                  <span className="font-semibold text-green-600">
                    ${creditsToCurrency(parseInt(payoutAmount) || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={isRequestingPayout || !payoutAmount || parseInt(payoutAmount) < minimumPayout}
            >
              {isRequestingPayout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Request Payout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
