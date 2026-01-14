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
import { eq, and } from "drizzle-orm";

// Test execution helper types
interface TestStep {
  action: string;
  target?: string;
  value?: string;
  assertion?: string;
  timeout?: number;
}

interface TestFlow {
  steps: TestStep[];
  setup?: string[];
  teardown?: string[];
}

interface ExploratoryConfig {
  startUrl: string;
  maxDepth?: number;
  patterns?: string[];
  excludePatterns?: string[];
  checkTypes?: string[];
}

interface TestResult {
  status: "PASSED" | "FAILED" | "ERROR" | "SKIPPED";
  errorMessage?: string;
  stackTrace?: string;
  findings?: Array<{
    type: string;
    severity: string;
    message: string;
    location?: string;
  }>;
  screenshots?: string[];
  consoleErrors?: string[];
  networkErrors?: Array<{
    url: string;
    status: number;
    message: string;
  }>;
  durationMs: number;
}

// POST - Execute a test run
// This endpoint initiates test execution. In a real implementation,
// this would communicate with a background worker that uses Playwright.
// For the admin panel, we'll provide the framework and instructions
// for how the MCP can be used to execute tests.
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

    if (run.status !== "PENDING") {
      return NextResponse.json(
        { error: `Run is already ${run.status}` },
        { status: 400 }
      );
    }

    // Mark run as started
    await db
      .update(securityTestRuns)
      .set({
        status: "RUNNING",
        startedAt: new Date(),
      })
      .where(eq(securityTestRuns.id, runId));

    // Get all pending results with their test definitions
    const pendingResults = await db
      .select({
        result: securityTestResults,
        test: securityTests,
      })
      .from(securityTestResults)
      .leftJoin(securityTests, eq(securityTestResults.testId, securityTests.id))
      .where(
        and(
          eq(securityTestResults.runId, runId),
          eq(securityTestResults.status, "PENDING")
        )
      );

    // Return the execution plan - the admin panel will use this
    // with the Playwright MCP to execute tests
    const executionPlan = pendingResults.map((r) => ({
      resultId: r.result.id,
      testId: r.test?.id,
      testName: r.test?.name,
      testType: r.test?.testType,
      category: r.test?.category,
      severity: r.test?.severity,
      testFlow: r.test?.testFlow as TestFlow | null,
      exploratoryConfig: r.test?.exploratoryConfig as ExploratoryConfig | null,
      expectedOutcome: r.test?.expectedOutcome,
    }));

    return NextResponse.json({
      runId,
      targetUrl: run.targetUrl,
      environment: run.environment,
      totalTests: pendingResults.length,
      executionPlan,
      instructions: {
        message: "Use the Playwright MCP to execute these tests",
        steps: [
          "1. Navigate to the target URL",
          "2. For each test in the execution plan:",
          "   - Mark the test as RUNNING via PUT /api/admin/security/execute",
          "   - Execute the test steps using Playwright MCP",
          "   - Capture screenshots, console errors, and network errors",
          "   - Update the result via PUT /api/admin/security/execute",
          "3. After all tests complete, call POST /api/admin/security/execute/complete",
        ],
      },
    });
  } catch (error) {
    console.error("Failed to start test execution:", error);
    return NextResponse.json(
      { error: "Failed to start execution" },
      { status: 500 }
    );
  }
}

// PUT - Update individual test result
export async function PUT(request: NextRequest) {
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
    const {
      resultId,
      status,
      errorMessage,
      stackTrace,
      findings,
      screenshots,
      consoleErrors,
      networkErrors,
      startedAt,
      completedAt,
      durationMs,
    } = body;

    if (!resultId) {
      return NextResponse.json({ error: "Result ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (stackTrace !== undefined) updateData.stackTrace = stackTrace;
    if (findings !== undefined) updateData.findings = findings;
    if (screenshots !== undefined) updateData.screenshots = screenshots;
    if (consoleErrors !== undefined) updateData.consoleErrors = consoleErrors;
    if (networkErrors !== undefined) updateData.networkErrors = networkErrors;
    if (startedAt) updateData.startedAt = new Date(startedAt);
    if (completedAt) updateData.completedAt = new Date(completedAt);
    if (durationMs !== undefined) updateData.durationMs = durationMs;

    const [result] = await db
      .update(securityTestResults)
      .set(updateData)
      .where(eq(securityTestResults.id, resultId))
      .returning();

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to update test result:", error);
    return NextResponse.json(
      { error: "Failed to update result" },
      { status: 500 }
    );
  }
}
