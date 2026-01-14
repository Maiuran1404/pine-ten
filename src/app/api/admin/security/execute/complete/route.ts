import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  securityTestRuns,
  securityTestResults,
  securityTests,
  securitySnapshots,
} from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";

// POST - Complete a test run and calculate final scores
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
    }

    // Get the run
    const [run] = await db
      .select()
      .from(securityTestRuns)
      .where(eq(securityTestRuns.id, runId));

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // Get result counts by status
    const resultCounts = await db
      .select({
        status: securityTestResults.status,
        count: count(),
      })
      .from(securityTestResults)
      .where(eq(securityTestResults.runId, runId))
      .groupBy(securityTestResults.status);

    const counts = {
      passed: 0,
      failed: 0,
      error: 0,
      skipped: 0,
      pending: 0,
      running: 0,
    };

    resultCounts.forEach((r) => {
      const status = r.status.toLowerCase() as keyof typeof counts;
      counts[status] = Number(r.count);
    });

    const totalTests = Object.values(counts).reduce((a, b) => a + b, 0);
    const completedTests = counts.passed + counts.failed + counts.error + counts.skipped;

    // Calculate score (passed / total * 100, weighted by severity)
    // Get results with severity for weighted scoring
    const resultsWithSeverity = await db
      .select({
        status: securityTestResults.status,
        severity: securityTests.severity,
      })
      .from(securityTestResults)
      .leftJoin(securityTests, eq(securityTestResults.testId, securityTests.id))
      .where(eq(securityTestResults.runId, runId));

    // Severity weights
    const severityWeights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    let totalWeight = 0;
    let passedWeight = 0;

    resultsWithSeverity.forEach((r) => {
      const weight = severityWeights[r.severity || "medium"] || 2;
      totalWeight += weight;
      if (r.status === "PASSED") {
        passedWeight += weight;
      }
    });

    const score = totalWeight > 0 ? (passedWeight / totalWeight) * 100 : 0;

    // Calculate duration
    const now = new Date();
    const startedAt = run.startedAt || run.createdAt;
    const durationMs = now.getTime() - startedAt.getTime();

    // Update the run
    const [updatedRun] = await db
      .update(securityTestRuns)
      .set({
        status: "COMPLETED",
        completedAt: now,
        durationMs,
        totalTests,
        passedTests: counts.passed,
        failedTests: counts.failed,
        errorTests: counts.error,
        skippedTests: counts.skipped,
        score: score.toFixed(2),
      })
      .where(eq(securityTestRuns.id, runId))
      .returning();

    // Get category scores for snapshot
    const categoryResults = await db
      .select({
        category: securityTests.category,
        status: securityTestResults.status,
      })
      .from(securityTestResults)
      .leftJoin(securityTests, eq(securityTestResults.testId, securityTests.id))
      .where(eq(securityTestResults.runId, runId));

    const categoryScores: Record<
      string,
      { score: number; passed: number; failed: number }
    > = {};

    categoryResults.forEach((r) => {
      const category = r.category || "uncategorized";
      if (!categoryScores[category]) {
        categoryScores[category] = { score: 0, passed: 0, failed: 0 };
      }
      if (r.status === "PASSED") {
        categoryScores[category].passed++;
      } else if (r.status === "FAILED" || r.status === "ERROR") {
        categoryScores[category].failed++;
      }
    });

    // Calculate category scores
    Object.keys(categoryScores).forEach((cat) => {
      const { passed, failed } = categoryScores[cat];
      const total = passed + failed;
      categoryScores[cat].score = total > 0 ? (passed / total) * 100 : 0;
    });

    // Count issues by severity from failed tests
    const failedResults = await db
      .select({
        severity: securityTests.severity,
      })
      .from(securityTestResults)
      .leftJoin(securityTests, eq(securityTestResults.testId, securityTests.id))
      .where(
        eq(securityTestResults.runId, runId)
      );

    const issueCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    failedResults.forEach((r) => {
      if (r.severity && r.severity in issueCounts) {
        issueCounts[r.severity as keyof typeof issueCounts]++;
      }
    });

    // Create security snapshot
    await db.insert(securitySnapshots).values({
      overallScore: score.toFixed(2),
      categoryScores,
      criticalIssues: issueCounts.critical,
      highIssues: issueCounts.high,
      mediumIssues: issueCounts.medium,
      lowIssues: issueCounts.low,
      lastTestRunId: runId,
    });

    return NextResponse.json({
      run: updatedRun,
      summary: {
        totalTests,
        passed: counts.passed,
        failed: counts.failed,
        error: counts.error,
        skipped: counts.skipped,
        score: Math.round(score * 10) / 10,
        durationMs,
        categoryScores,
      },
    });
  } catch (error) {
    console.error("Failed to complete test run:", error);
    return NextResponse.json(
      { error: "Failed to complete test run" },
      { status: 500 }
    );
  }
}
