"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface SecurityFinding {
  type: string;
  severity: string;
  message: string;
  location?: string;
}

interface TestResult {
  id: string;
  testName: string;
  category: string;
  severity: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "ERROR" | "SKIPPED";
  errorMessage?: string;
  findings?: SecurityFinding[];
  durationMs?: number;
}

interface TestRun {
  id: string;
  status: string;
  targetUrl: string;
  environment: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorTests: number;
  score: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface CategorySummary {
  category: string;
  total: number;
  passed: number;
  failed: number;
  errors: number;
}

interface SecurityOverview {
  summary: {
    totalTests: number;
    lastRunScore: number | null;
    lastRunAt: string | null;
    runsLast24h: number;
  };
  recentRuns: TestRun[];
  testCategories: Array<{ category: string; count: number }>;
}

// Remediation guidance for different finding types
const remediationGuides: Record<string, { title: string; steps: string[] }> = {
  missing_header: {
    title: "Add Missing Security Headers",
    steps: [
      "Add the security header to your server configuration or middleware",
      "For Next.js, add headers to next.config.js or middleware.ts",
      "Test the header is present using browser dev tools",
    ],
  },
  cors_misconfiguration: {
    title: "Fix CORS Configuration",
    steps: [
      "Review your CORS policy in API routes or middleware",
      "Specify explicit allowed origins instead of '*'",
      "Never reflect arbitrary Origin headers",
    ],
  },
  unprotected_endpoint: {
    title: "Secure API Endpoint",
    steps: [
      "Add authentication middleware to the endpoint",
      "Verify session/token before processing requests",
      "Return 401 for unauthenticated requests",
    ],
  },
  insecure_transport: {
    title: "Enable HTTPS",
    steps: [
      "Configure SSL certificate on your server",
      "Redirect HTTP to HTTPS",
      "Add HSTS header for security",
    ],
  },
  test_failure: {
    title: "Investigate Test Failure",
    steps: [
      "Review the test requirements and expected behavior",
      "Check application logs for related errors",
      "Run the test manually to reproduce the issue",
    ],
  },
};

export default function SecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [latestRun, setLatestRun] = useState<TestRun | null>(null);
  const [latestResults, setLatestResults] = useState<TestResult[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  // Run config
  const [runConfig, setRunConfig] = useState({
    targetUrl: "",
    environment: "production",
  });
  const [isRunning, setIsRunning] = useState(false);

  // Execution progress
  const [executionProgress, setExecutionProgress] = useState<{
    isExecuting: boolean;
    runId: string | null;
    status: string;
    totalTests: number;
    completedTests: number;
    passedTests: number;
    failedTests: number;
    currentTest: string | null;
    percentage: number;
  }>({
    isExecuting: false,
    runId: null,
    status: "idle",
    totalTests: 0,
    completedTests: 0,
    passedTests: 0,
    failedTests: 0,
    currentTest: null,
    percentage: 0,
  });

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security");
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error);
    }
  }, []);

  // Fetch latest run results
  const fetchLatestRunResults = useCallback(async () => {
    try {
      const runsRes = await fetch("/api/admin/security/runs?limit=1");
      if (runsRes.ok) {
        const { runs } = await runsRes.json();
        if (runs && runs.length > 0) {
          const run = runs[0];
          setLatestRun(run);

          // Fetch detailed results for the latest run
          if (run.status === "COMPLETED") {
            const resultsRes = await fetch(`/api/admin/security/execute?runId=${run.id}`);
            if (resultsRes.ok) {
              const data = await resultsRes.json();
              setLatestResults(data.results || []);

              // Calculate category stats
              const catMap = new Map<string, CategorySummary>();
              for (const result of data.results || []) {
                const cat = result.category || "unknown";
                if (!catMap.has(cat)) {
                  catMap.set(cat, { category: cat, total: 0, passed: 0, failed: 0, errors: 0 });
                }
                const stats = catMap.get(cat)!;
                stats.total++;
                if (result.status === "PASSED") stats.passed++;
                else if (result.status === "FAILED") stats.failed++;
                else if (result.status === "ERROR") stats.errors++;
              }
              setCategoryStats(Array.from(catMap.values()).sort((a, b) => {
                // Sort by failures first
                const aIssues = a.failed + a.errors;
                const bIssues = b.failed + b.errors;
                return bIssues - aIssues;
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch latest run:", error);
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchOverview(), fetchLatestRunResults()]);
    setIsLoading(false);
  }, [fetchOverview, fetchLatestRunResults]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling for execution progress
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (executionProgress.isExecuting && executionProgress.runId) {
      const pollProgress = async () => {
        try {
          const res = await fetch(`/api/admin/security/execute?runId=${executionProgress.runId}`);
          if (res.ok) {
            const data = await res.json();
            setExecutionProgress((prev) => ({
              ...prev,
              totalTests: data.progress.total,
              completedTests: data.progress.completed,
              passedTests: data.run.passedTests || 0,
              failedTests: data.run.failedTests || 0,
              currentTest: data.progress.currentTest?.name || null,
              percentage: data.progress.percentage,
              status: data.run.status === "COMPLETED" ? "completed" : "running",
              isExecuting: data.run.status === "RUNNING",
            }));

            if (data.run.status === "COMPLETED") {
              await refreshAll();
            }
          }
        } catch (error) {
          console.error("Failed to poll progress:", error);
        }
      };

      pollingRef.current = setInterval(pollProgress, 500);
      pollProgress();

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [executionProgress.isExecuting, executionProgress.runId, refreshAll]);

  // Start test run
  const handleStartRun = async () => {
    if (!runConfig.targetUrl) return;
    setIsRunning(true);
    try {
      const createRes = await fetch("/api/admin/security/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runConfig),
      });
      if (createRes.ok) {
        const { run } = await createRes.json();
        setShowRunDialog(false);

        setExecutionProgress({
          isExecuting: true,
          runId: run.id,
          status: "running",
          totalTests: run.totalTests || 0,
          completedTests: 0,
          passedTests: 0,
          failedTests: 0,
          currentTest: "Starting...",
          percentage: 0,
        });

        fetch("/api/admin/security/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: run.id }),
        }).then(async (res) => {
          if (res.ok) {
            const result = await res.json();
            setExecutionProgress((prev) => ({
              ...prev,
              isExecuting: false,
              status: "completed",
              completedTests: result.totalTests,
              passedTests: result.passedTests,
              failedTests: result.failedTests,
              currentTest: null,
              percentage: 100,
            }));
          } else {
            setExecutionProgress((prev) => ({
              ...prev,
              isExecuting: false,
              status: "error",
            }));
          }
        });
      } else {
        const errorData = await createRes.json();
        alert(errorData.error || "Failed to start test run");
      }
    } catch (error) {
      console.error("Failed to start run:", error);
      alert("Failed to start test run");
    }
    setIsRunning(false);
  };

  // Quick run with last URL
  const handleQuickRun = async () => {
    const lastUrl = latestRun?.targetUrl || localStorage.getItem("lastSecurityTestUrl");
    if (lastUrl) {
      setRunConfig({ targetUrl: lastUrl, environment: "production" });
      setShowRunDialog(true);
    } else {
      setShowRunDialog(true);
    }
  };

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get all failed tests with findings
  const failedTests = latestResults.filter(
    (r) => r.status === "FAILED" || r.status === "ERROR"
  );

  const score = latestRun?.score ? parseFloat(latestRun.score) : 0;
  const hasRun = !!latestRun && latestRun.status === "COMPLETED";

  if (isLoading && !overview) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40 md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security</h1>
          <p className="text-muted-foreground">
            {hasRun
              ? `Last scan ${formatTime(latestRun.completedAt)} on ${latestRun.targetUrl}`
              : "Run your first security scan to see results"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={handleQuickRun} className="gap-2">
            <Zap className="h-4 w-4" />
            {latestRun?.targetUrl ? "Re-run Scan" : "Run Scan"}
          </Button>
        </div>
      </div>

      {/* Execution Progress Banner */}
      {executionProgress.isExecuting && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Running Security Scan...</span>
                  <span className="text-sm text-muted-foreground">
                    {executionProgress.completedTests}/{executionProgress.totalTests} tests
                  </span>
                </div>
                <Progress value={executionProgress.percentage} className="h-2" />
                {executionProgress.currentTest && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Testing: {executionProgress.currentTest}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Security Score Card */}
        <Card className={cn(
          "relative overflow-hidden",
          hasRun ? (score >= 70 ? "border-green-200" : "border-red-200") : "border-gray-200"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {hasRun ? (
                score >= 70 ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                )
              ) : (
                <Shield className="h-4 w-4 text-gray-400" />
              )}
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasRun ? (
              <>
                <div className={cn("text-5xl font-bold", getScoreColor(score))}>
                  {score.toFixed(0)}%
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Passed</span>
                    <span className="font-medium text-green-600">
                      {latestRun.passedTests} tests
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Failed</span>
                    <span className="font-medium text-red-600">
                      {latestRun.failedTests} tests
                    </span>
                  </div>
                </div>
                {/* Score trend indicator */}
                {(() => {
                  // Find a previous COMPLETED run (not the current one)
                  const completedRuns = overview?.recentRuns.filter(
                    (r) => r.status === "COMPLETED" && r.id !== latestRun?.id
                  ) || [];
                  const prevRun = completedRuns[0];

                  if (!prevRun || !prevRun.score) return null;

                  const prevScore = parseFloat(prevRun.score);
                  const diff = score - prevScore;

                  if (diff === 0) return null;

                  return (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        {diff > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">+{diff.toFixed(0)}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">{diff.toFixed(0)}%</span>
                          </>
                        )}
                        <span className="text-muted-foreground">vs previous scan</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="py-8 text-center">
                <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground">No scans yet</p>
                <Button variant="link" onClick={handleQuickRun} className="mt-2">
                  Run your first scan <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
          {hasRun && (
            <div
              className={cn("absolute bottom-0 left-0 right-0 h-1", getScoreBgColor(score))}
            />
          )}
        </Card>

        {/* Issues Found Panel */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {failedTests.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : hasRun ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  {failedTests.length > 0
                    ? `${failedTests.length} Issues Found`
                    : hasRun
                    ? "All Tests Passed"
                    : "Issues"}
                </CardTitle>
                <CardDescription>
                  {failedTests.length > 0
                    ? "Click each issue to see details and how to fix"
                    : hasRun
                    ? "No security issues detected in the last scan"
                    : "Run a scan to detect security issues"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasRun ? (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <ShieldAlert className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  No security scan results yet
                </p>
                <Button onClick={handleQuickRun}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Security Scan
                </Button>
              </div>
            ) : failedTests.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="font-medium text-green-700">
                  Excellent! No security issues detected
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  All {latestRun.totalTests} tests passed successfully
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {failedTests.map((test) => (
                  <Collapsible
                    key={test.id}
                    open={expandedFindings.has(test.id)}
                    onOpenChange={() => toggleFinding(test.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-muted/50 transition-colors",
                          test.severity === "critical"
                            ? "border-red-200 bg-red-50/50"
                            : test.severity === "high"
                            ? "border-orange-200 bg-orange-50/50"
                            : "border-yellow-200 bg-yellow-50/50"
                        )}
                      >
                        {getSeverityIcon(test.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{test.testName}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.category} &middot; {test.severity}
                          </div>
                        </div>
                        {expandedFindings.has(test.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-7 p-4 bg-muted/30 rounded-lg space-y-4">
                        {/* Error message */}
                        {test.errorMessage && (
                          <div>
                            <div className="text-sm font-medium mb-1">Error</div>
                            <div className="text-sm text-red-600 font-mono bg-red-50 p-2 rounded">
                              {test.errorMessage}
                            </div>
                          </div>
                        )}

                        {/* Findings */}
                        {test.findings && test.findings.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Findings</div>
                            <div className="space-y-2">
                              {test.findings.map((finding, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm p-2 bg-white rounded border"
                                >
                                  <div className="flex items-start gap-2">
                                    {getSeverityIcon(finding.severity)}
                                    <div>
                                      <div>{finding.message}</div>
                                      {finding.location && (
                                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                                          {finding.location}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Remediation */}
                        {test.findings && test.findings[0] && (
                          <div>
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Zap className="h-4 w-4 text-blue-600" />
                              How to Fix
                            </div>
                            <div className="text-sm bg-blue-50 p-3 rounded-lg">
                              {(() => {
                                const guide =
                                  remediationGuides[test.findings[0].type] ||
                                  remediationGuides.test_failure;
                                return (
                                  <div>
                                    <div className="font-medium mb-2">{guide.title}</div>
                                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                      {guide.steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {hasRun && categoryStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results by Category</CardTitle>
            <CardDescription>
              Click a category to see detailed test results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryStats.map((cat) => {
                const passRate = cat.total > 0 ? (cat.passed / cat.total) * 100 : 0;
                const hasIssues = cat.failed > 0 || cat.errors > 0;
                const isExpanded = expandedCategories.has(cat.category);

                return (
                  <Collapsible
                    key={cat.category}
                    open={isExpanded}
                    onOpenChange={() => toggleCategory(cat.category)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          "p-4 rounded-lg border transition-colors hover:bg-muted/50",
                          hasIssues ? "border-red-200" : "border-green-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium",
                                passRate >= 90
                                  ? "text-green-600"
                                  : passRate >= 70
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              )}
                            >
                              {passRate.toFixed(0)}%
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <Progress
                          value={passRate}
                          className={cn(
                            "h-2",
                            passRate >= 90
                              ? "[&>div]:bg-green-500"
                              : passRate >= 70
                              ? "[&>div]:bg-yellow-500"
                              : "[&>div]:bg-red-500"
                          )}
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{cat.passed} passed</span>
                          {hasIssues && (
                            <span className="text-red-600">{cat.failed + cat.errors} failed</span>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-1">
                        {latestResults
                          .filter((r) => r.category === cat.category)
                          .map((result) => (
                            <div
                              key={result.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded text-sm",
                                result.status === "PASSED"
                                  ? "bg-green-50"
                                  : result.status === "FAILED"
                                  ? "bg-red-50"
                                  : "bg-gray-50"
                              )}
                            >
                              {result.status === "PASSED" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : result.status === "FAILED" ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                              )}
                              <span className="flex-1 truncate">{result.testName}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  result.severity === "critical"
                                    ? "border-red-300 text-red-700"
                                    : result.severity === "high"
                                    ? "border-orange-300 text-orange-700"
                                    : "border-gray-300"
                                )}
                              >
                                {result.severity}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scan History */}
      {overview && overview.recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.recentRuns.slice(0, 5).map((run) => {
                const runScore = run.score ? parseFloat(run.score) : 0;
                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === "COMPLETED" ? (
                        runScore >= 70 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )
                      ) : run.status === "RUNNING" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{run.targetUrl}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(run.completedAt || run.createdAt)} &middot;{" "}
                          {run.environment}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {run.status === "COMPLETED" && (
                        <>
                          <div className="text-right">
                            <div className={cn("font-bold", getScoreColor(runScore))}>
                              {runScore.toFixed(0)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {run.passedTests}/{run.totalTests} passed
                            </div>
                          </div>
                        </>
                      )}
                      <Badge
                        variant={
                          run.status === "COMPLETED"
                            ? "default"
                            : run.status === "RUNNING"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {run.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Security Scan</DialogTitle>
            <DialogDescription>
              Enter the URL to scan for security vulnerabilities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target URL</Label>
              <Input
                placeholder="https://your-site.com"
                value={runConfig.targetUrl}
                onChange={(e) =>
                  setRunConfig({ ...runConfig, targetUrl: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={runConfig.environment}
                onValueChange={(v) => setRunConfig({ ...runConfig, environment: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartRun}
              disabled={!runConfig.targetUrl || isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
