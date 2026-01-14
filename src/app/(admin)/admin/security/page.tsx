"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  Calendar,
  Activity,
  Eye,
  Trash2,
  Settings,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface SecurityOverview {
  snapshot: {
    id: string;
    overallScore: string;
    categoryScores: Record<string, { score: number; passed: number; failed: number }>;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    createdAt: string;
  } | null;
  recentRuns: Array<{
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
  }>;
  schedules: Array<{
    id: string;
    name: string;
    description: string | null;
    frequency: string;
    isActive: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
  }>;
  testCategories: Array<{ category: string; count: number }>;
  testUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  summary: {
    totalTests: number;
    activeSchedules: number;
    testUsers: number;
    runsLast24h: number;
    lastRunAt: string | null;
    lastRunScore: number | null;
    averagePassRate: number | null;
  };
}

interface SecurityTest {
  id: string;
  name: string;
  description: string | null;
  category: string;
  testType: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
}

interface TestSchedule {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  timezone: string;
  testIds: string[];
  categories: string[];
  testUserId: string | null;
  targetEnvironment: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  testUser?: { name: string; email: string } | null;
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
  skippedTests: number;
  score: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  schedule?: { name: string } | null;
  testUser?: { name: string; email: string } | null;
}

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  hasCredentials: boolean;
  lastUsedAt: string | null;
}

export default function SecurityPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [schedules, setSchedules] = useState<TestSchedule[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSeeding, setIsSeeding] = useState(false);

  // Dialog states
  const [showNewTestDialog, setShowNewTestDialog] = useState(false);
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);

  // Form states
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    category: "auth",
    testType: "deterministic",
    severity: "medium",
  });
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    description: "",
    frequency: "DAILY",
    testUserId: "",
    targetEnvironment: "production",
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "client",
  });
  const [runConfig, setRunConfig] = useState({
    targetUrl: "",
    environment: "production",
    testUserId: "",
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch functions
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

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/tests");
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/runs");
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error("Failed to fetch runs:", error);
    }
  }, []);

  const fetchTestUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/security/test-users");
      if (res.ok) {
        const data = await res.json();
        setTestUsers(data.testUsers || []);
      }
    } catch (error) {
      console.error("Failed to fetch test users:", error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchTests(),
      fetchSchedules(),
      fetchRuns(),
      fetchTestUsers(),
    ]);
    setIsLoading(false);
  }, [fetchOverview, fetchTests, fetchSchedules, fetchRuns, fetchTestUsers]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Action handlers
  const handleCreateTest = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/security/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTest),
      });
      if (res.ok) {
        setShowNewTestDialog(false);
        setNewTest({
          name: "",
          description: "",
          category: "auth",
          testType: "deterministic",
          severity: "medium",
        });
        await fetchTests();
        await fetchOverview();
      }
    } catch (error) {
      console.error("Failed to create test:", error);
    }
    setIsSaving(false);
  };

  const handleCreateSchedule = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/security/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSchedule,
          testUserId: newSchedule.testUserId && newSchedule.testUserId !== "none" ? newSchedule.testUserId : null,
        }),
      });
      if (res.ok) {
        setShowNewScheduleDialog(false);
        setNewSchedule({
          name: "",
          description: "",
          frequency: "DAILY",
          testUserId: "",
          targetEnvironment: "production",
        });
        await fetchSchedules();
        await fetchOverview();
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
    }
    setIsSaving(false);
  };

  const handleCreateUser = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/security/test-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setShowNewUserDialog(false);
        setNewUser({ name: "", email: "", role: "client" });
        await fetchTestUsers();
        await fetchOverview();
      }
    } catch (error) {
      console.error("Failed to create user:", error);
    }
    setIsSaving(false);
  };

  const handleStartRun = async () => {
    if (!runConfig.targetUrl) return;
    setIsRunning(true);
    try {
      // Create the run
      const createRes = await fetch("/api/admin/security/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: runConfig.targetUrl,
          environment: runConfig.environment,
          testUserId: runConfig.testUserId && runConfig.testUserId !== "none" ? runConfig.testUserId : null,
        }),
      });
      if (createRes.ok) {
        const { run } = await createRes.json();
        setShowRunDialog(false);
        setRunConfig({ targetUrl: "", environment: "production", testUserId: "" });
        await fetchRuns();
        await fetchOverview();

        // The run is now created with PENDING status
        // The admin can use the Playwright MCP to execute tests
        alert(`Test run created! Run ID: ${run.id}\n\nUse the Playwright MCP to execute the tests.`);
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

  const handleDeleteTest = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    try {
      await fetch(`/api/admin/security/tests?id=${id}`, { method: "DELETE" });
      await fetchTests();
      await fetchOverview();
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const handleToggleSchedule = async (schedule: TestSchedule) => {
    try {
      await fetch("/api/admin/security/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schedule.id, isActive: !schedule.isActive }),
      });
      await fetchSchedules();
      await fetchOverview();
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  const handleSeedTests = async () => {
    if (!confirm("This will add default security tests. Continue?")) return;
    setIsSeeding(true);
    try {
      const res = await fetch("/api/admin/security/seed", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully seeded ${data.tests?.length || 0} security tests!`);
        await fetchTests();
        await fetchOverview();
      } else {
        const error = await res.json();
        alert(`Failed to seed tests: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to seed tests:", error);
    }
    setIsSeeding(false);
  };

  const handleViewRun = (runId: string) => {
    router.push(`/admin/security/runs/${runId}`);
  };

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 70) return "bg-yellow-100";
    if (score >= 50) return "bg-orange-100";
    return "bg-red-100";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "RUNNING":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case "PENDING":
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-gray-100 text-gray-600">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security</h1>
            <p className="text-muted-foreground">Loading security dashboard...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const score = overview?.snapshot?.overallScore
    ? parseFloat(overview.snapshot.overallScore)
    : overview?.summary.lastRunScore || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security</h1>
          <p className="text-muted-foreground">
            Monitor and test platform security
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Test Run</DialogTitle>
                <DialogDescription>
                  Configure and start a new security test run
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
                    onValueChange={(v) =>
                      setRunConfig({ ...runConfig, environment: v })
                    }
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
                <div className="space-y-2">
                  <Label>Test User (Optional)</Label>
                  <Select
                    value={runConfig.testUserId}
                    onValueChange={(v) =>
                      setRunConfig({ ...runConfig, testUserId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select test user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific user</SelectItem>
                      {testUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
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
                      Start Run
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn("col-span-1", getScoreBg(score))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-4xl font-bold", getScoreColor(score))}>
              {score.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {score >= 90
                ? "Excellent"
                : score >= 70
                ? "Good"
                : score >= 50
                ? "Needs Improvement"
                : "Critical"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tests (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.summary.runsLast24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.summary.totalTests || 0} total tests defined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.summary.activeSchedules || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Automated test cadences
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {overview?.snapshot && (
                <>
                  {overview.snapshot.criticalIssues > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                      {overview.snapshot.criticalIssues} Critical
                    </Badge>
                  )}
                  {overview.snapshot.highIssues > 0 && (
                    <Badge className="bg-orange-100 text-orange-800">
                      {overview.snapshot.highIssues} High
                    </Badge>
                  )}
                  {overview.snapshot.criticalIssues === 0 &&
                    overview.snapshot.highIssues === 0 && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        No critical issues
                      </span>
                    )}
                </>
              )}
              {!overview?.snapshot && (
                <span className="text-sm text-muted-foreground">
                  No tests run yet
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="users">Test Users</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Runs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Test Runs</CardTitle>
                <CardDescription>Latest security test executions</CardDescription>
              </CardHeader>
              <CardContent>
                {overview?.recentRuns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No test runs yet. Click &quot;Run Tests&quot; to start.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {overview?.recentRuns.slice(0, 5).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(run.status)}
                            <span className="text-sm font-medium">
                              {run.environment}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(run.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          {run.score && (
                            <div
                              className={cn(
                                "text-lg font-bold",
                                getScoreColor(parseFloat(run.score))
                              )}
                            >
                              {parseFloat(run.score).toFixed(0)}%
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {run.passedTests}/{run.totalTests} passed
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Test Categories</CardTitle>
                <CardDescription>Tests organized by security area</CardDescription>
              </CardHeader>
              <CardContent>
                {overview?.testCategories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No tests defined yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {overview?.testCategories.map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium capitalize">
                            {cat.category}
                          </span>
                        </div>
                        <Badge variant="secondary">{cat.count} tests</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Schedules */}
          <Card>
            <CardHeader>
              <CardTitle>Active Schedules</CardTitle>
              <CardDescription>Automated test cadences</CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.schedules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No schedules configured. Create one to run tests automatically.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {overview?.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 rounded-lg border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{schedule.name}</span>
                        <Badge variant="outline">{schedule.frequency}</Badge>
                      </div>
                      {schedule.nextRunAt && (
                        <p className="text-xs text-muted-foreground">
                          Next: {formatDate(schedule.nextRunAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Tests</CardTitle>
                  <CardDescription>
                    Define deterministic and exploratory tests
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSeedTests}
                    disabled={isSeeding}
                  >
                    {isSeeding ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Seed Default Tests
                  </Button>
                  <Dialog open={showNewTestDialog} onOpenChange={setShowNewTestDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Test
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Security Test</DialogTitle>
                      <DialogDescription>
                        Define a new security test case
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Test Name</Label>
                        <Input
                          placeholder="Login flow validation"
                          value={newTest.name}
                          onChange={(e) =>
                            setNewTest({ ...newTest, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe what this test verifies"
                          value={newTest.description}
                          onChange={(e) =>
                            setNewTest({ ...newTest, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={newTest.category}
                            onValueChange={(v) =>
                              setNewTest({ ...newTest, category: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auth">Authentication</SelectItem>
                              <SelectItem value="payment">Payment</SelectItem>
                              <SelectItem value="navigation">Navigation</SelectItem>
                              <SelectItem value="forms">Forms</SelectItem>
                              <SelectItem value="api">API</SelectItem>
                              <SelectItem value="permissions">Permissions</SelectItem>
                              <SelectItem value="data">Data Integrity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Test Type</Label>
                          <Select
                            value={newTest.testType}
                            onValueChange={(v) =>
                              setNewTest({ ...newTest, testType: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deterministic">
                                Deterministic
                              </SelectItem>
                              <SelectItem value="exploratory">Exploratory</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select
                          value={newTest.severity}
                          onValueChange={(v) =>
                            setNewTest({ ...newTest, severity: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewTestDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTest}
                        disabled={!newTest.name || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Create Test
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tests defined yet. Create your first security test.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{test.name}</div>
                            {test.description && (
                              <div className="text-xs text-muted-foreground">
                                {test.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{test.category}</TableCell>
                        <TableCell className="capitalize">{test.testType}</TableCell>
                        <TableCell>{getSeverityBadge(test.severity)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={test.isActive ? "default" : "secondary"}
                          >
                            {test.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Schedules</CardTitle>
                  <CardDescription>
                    Configure automated test cadences
                  </CardDescription>
                </div>
                <Dialog
                  open={showNewScheduleDialog}
                  onOpenChange={setShowNewScheduleDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Schedule</DialogTitle>
                      <DialogDescription>
                        Set up an automated test cadence
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Schedule Name</Label>
                        <Input
                          placeholder="Daily production tests"
                          value={newSchedule.name}
                          onChange={(e) =>
                            setNewSchedule({ ...newSchedule, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Optional description"
                          value={newSchedule.description}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select
                            value={newSchedule.frequency}
                            onValueChange={(v) =>
                              setNewSchedule({ ...newSchedule, frequency: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HOURLY">Hourly</SelectItem>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Environment</Label>
                          <Select
                            value={newSchedule.targetEnvironment}
                            onValueChange={(v) =>
                              setNewSchedule({
                                ...newSchedule,
                                targetEnvironment: v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">Production</SelectItem>
                              <SelectItem value="staging">Staging</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Test User (Optional)</Label>
                        <Select
                          value={newSchedule.testUserId}
                          onValueChange={(v) =>
                            setNewSchedule({ ...newSchedule, testUserId: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select test user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No specific user</SelectItem>
                            {testUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewScheduleDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateSchedule}
                        disabled={!newSchedule.name || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Create Schedule
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No schedules configured. Create one to run tests automatically.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Test User</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{schedule.name}</div>
                            {schedule.description && (
                              <div className="text-xs text-muted-foreground">
                                {schedule.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{schedule.frequency}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {schedule.targetEnvironment}
                        </TableCell>
                        <TableCell>
                          {schedule.testUser ? schedule.testUser.name : "-"}
                        </TableCell>
                        <TableCell>
                          {schedule.nextRunAt
                            ? formatDate(schedule.nextRunAt)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={schedule.isActive ? "default" : "secondary"}
                          >
                            {schedule.isActive ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSchedule(schedule)}
                          >
                            {schedule.isActive ? "Pause" : "Resume"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Run History</CardTitle>
              <CardDescription>View past test executions and results</CardDescription>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No test runs yet. Click &quot;Run Tests&quot; to start.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Tests</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{formatDate(run.createdAt)}</TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell className="capitalize">{run.environment}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">{run.passedTests}</span>
                            <span>/</span>
                            <span className="text-red-600">{run.failedTests}</span>
                            <span>/</span>
                            <span>{run.totalTests}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {run.score ? (
                            <span
                              className={cn(
                                "font-bold",
                                getScoreColor(parseFloat(run.score))
                              )}
                            >
                              {parseFloat(run.score).toFixed(0)}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(run.durationMs)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRun(run.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Users</CardTitle>
                  <CardDescription>
                    Manage accounts used for automated testing
                  </CardDescription>
                </div>
                <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Test User</DialogTitle>
                      <DialogDescription>
                        Add a user account for automated testing
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Test Client User"
                          value={newUser.name}
                          onChange={(e) =>
                            setNewUser({ ...newUser, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="test@example.com"
                          value={newUser.email}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="freelancer">Freelancer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewUserDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateUser}
                        disabled={!newUser.name || !newUser.email || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Create User
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {testUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No test users configured. Create one to use in automated tests.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastUsedAt ? formatDate(user.lastUsedAt) : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
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
  );
}
