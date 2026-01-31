"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PayoutStats {
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  pendingTasksCount: number;
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
  status: "processing" | "completed" | "failed";
  method: string;
  requestedAt: string;
  completedAt: string | null;
}

interface MonthlyEarning {
  month: string;
  year: number;
  credits: number;
  tasksCompleted: number;
}

export default function PayoutsPage() {
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryEntry[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const fetchPayoutData = async () => {
    try {
      const res = await fetch("/api/freelancer/payouts");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setEarnings(data.earnings || []);
        setPayoutHistory(data.payoutHistory || []);
        setMonthlyEarnings(data.monthlyEarnings || []);
      }
    } catch (error) {
      console.error("Failed to fetch payout data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate credit to currency conversion (example: 1 credit = $10)
  const creditsToCurrency = (credits: number) => {
    return (credits * 10).toFixed(2);
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
  const minimumPayout = 10; // Minimum credits required for payout
  const canRequestPayout = availableForPayout >= minimumPayout;

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
                  <p>Minimum {minimumPayout} credits required for payout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </Button>
      </div>

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
            {!canRequestPayout && availableForPayout > 0 && (
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
                    From {stats?.pendingTasksCount || 0} tasks in review
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Credits become available after tasks are approved</p>
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
              Lifetime Earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold">
                {stats?.lifetimeEarnings || 0}
              </span>
              <span className="text-muted-foreground">credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${creditsToCurrency(stats?.lifetimeEarnings || 0)}
            </p>
            {stats?.thisMonthEarnings !== undefined && stats.thisMonthEarnings > 0 && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +{stats.thisMonthEarnings} credits this month
              </p>
            )}
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
                            : payout.status === "processing"
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30"
                        }`}>
                          {payout.status === "completed" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : payout.status === "processing" ? (
                            <Clock className="h-5 w-5" />
                          ) : (
                            <AlertCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payout.amount} credits</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.method} • {formatDate(payout.requestedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          payout.status === "completed"
                            ? "default"
                            : payout.status === "processing"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payout.status === "completed" ? "Completed" :
                         payout.status === "processing" ? "Processing" : "Failed"}
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
            Set up your payment method to receive payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Add payment method</p>
                <p className="text-sm text-muted-foreground">
                  Bank account or PayPal to receive payouts
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Payouts typically take 3-5 business days to process
          </p>
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
    </div>
  );
}
