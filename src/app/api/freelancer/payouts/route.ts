import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, payouts, stripeConnectAccounts } from "@/db/schema";
import { eq, and, gte, lt, desc, sum, count, sql } from "drizzle-orm";
import { getPayoutSettings } from "@/lib/platform-settings";
import {
  calculatePayoutAmounts,
  createPayoutRequest,
  processPayoutTransfer,
  getConnectAccount,
} from "@/lib/stripe-connect";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get payout settings from database
    const payoutSettings = await getPayoutSettings();

    // Calculate date boundaries
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Define the holding period from database settings
    const holdingPeriodDays = payoutSettings.holdingPeriodDays;
    const availableCutoff = new Date();
    availableCutoff.setDate(availableCutoff.getDate() - holdingPeriodDays);

    // Get lifetime earnings from completed tasks
    const lifetimeResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED")
        )
      );

    // Get available balance (completed tasks older than 7 days)
    const availableResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          lt(tasks.completedAt, availableCutoff)
        )
      );

    // Get pending balance (completed tasks within last 7 days + tasks in review)
    const pendingCompletedResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, availableCutoff)
        )
      );

    // Get pending from tasks in review
    const pendingReviewResult = await db
      .select({
        total: sum(tasks.creditsUsed),
        count: count(),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          sql`${tasks.status} IN ('IN_REVIEW', 'PENDING_ADMIN_REVIEW')`
        )
      );

    // This month's earnings
    const thisMonthResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, startOfThisMonth)
        )
      );

    // Last month's earnings
    const lastMonthResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          gte(tasks.completedAt, startOfLastMonth),
          lt(tasks.completedAt, startOfThisMonth)
        )
      );

    // Get recent earnings (individual tasks)
    const recentEarnings = await db
      .select({
        id: tasks.id,
        taskId: tasks.id,
        taskTitle: tasks.title,
        credits: tasks.creditsUsed,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED")
        )
      )
      .orderBy(desc(tasks.completedAt))
      .limit(20);

    // Format earnings with status
    const earnings = recentEarnings.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      credits: entry.credits,
      completedAt: entry.completedAt?.toISOString() || new Date().toISOString(),
      status: entry.completedAt && entry.completedAt < availableCutoff
        ? "available" as const
        : "pending" as const,
    }));

    // Get monthly earnings breakdown (last 6 months)
    const monthlyEarnings = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthResult = await db
        .select({
          total: sum(tasks.creditsUsed),
          taskCount: count(),
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.freelancerId, userId),
            eq(tasks.status, "COMPLETED"),
            gte(tasks.completedAt, monthStart),
            lt(tasks.completedAt, monthEnd)
          )
        );

      const monthName = monthStart.toLocaleString("en-US", { month: "long" });

      monthlyEarnings.push({
        month: monthName,
        year: monthStart.getFullYear(),
        credits: Number(monthResult[0]?.total) || 0,
        tasksCompleted: Number(monthResult[0]?.taskCount) || 0,
      });
    }

    // Calculate totals
    const pendingFromCompleted = Number(pendingCompletedResult[0]?.total) || 0;
    const pendingFromReview = Number(pendingReviewResult[0]?.total) || 0;
    const pendingTasksCount = Number(pendingReviewResult[0]?.count) || 0;

    const stats = {
      availableBalance: Number(availableResult[0]?.total) || 0,
      pendingBalance: pendingFromCompleted + pendingFromReview,
      lifetimeEarnings: Number(lifetimeResult[0]?.total) || 0,
      thisMonthEarnings: Number(thisMonthResult[0]?.total) || 0,
      lastMonthEarnings: Number(lastMonthResult[0]?.total) || 0,
      pendingTasksCount: pendingTasksCount,
    };

    // Get payout history from database
    const payoutHistoryResult = await db
      .select({
        id: payouts.id,
        amount: payouts.creditsAmount,
        netAmountUsd: payouts.netAmountUsd,
        status: payouts.status,
        payoutMethod: payouts.payoutMethod,
        requestedAt: payouts.requestedAt,
        processedAt: payouts.processedAt,
        failureReason: payouts.failureReason,
      })
      .from(payouts)
      .where(eq(payouts.freelancerId, userId))
      .orderBy(desc(payouts.requestedAt))
      .limit(20);

    const payoutHistory = payoutHistoryResult.map((p) => ({
      id: p.id,
      amount: p.amount,
      netAmountUsd: Number(p.netAmountUsd),
      status: p.status.toLowerCase(),
      method: p.payoutMethod || "stripe_connect",
      requestedAt: p.requestedAt.toISOString(),
      completedAt: p.processedAt?.toISOString() || null,
      failureReason: p.failureReason,
    }));

    // Calculate total paid out
    const totalPaidOutResult = await db
      .select({
        total: sum(payouts.creditsAmount),
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.freelancerId, userId),
          eq(payouts.status, "COMPLETED")
        )
      );

    const totalPaidOut = Number(totalPaidOutResult[0]?.total) || 0;

    // Adjust available balance by subtracting already paid out and pending payouts
    const pendingPayoutsResult = await db
      .select({
        total: sum(payouts.creditsAmount),
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.freelancerId, userId),
          sql`${payouts.status} IN ('PENDING', 'PROCESSING')`
        )
      );

    const pendingPayouts = Number(pendingPayoutsResult[0]?.total) || 0;
    const adjustedAvailableBalance = Math.max(0, stats.availableBalance - totalPaidOut - pendingPayouts);

    // Get Stripe Connect status
    const connectAccount = await getConnectAccount(userId);

    // Get payout configuration from database settings
    const payoutConfig = {
      minimumPayoutCredits: payoutSettings.minimumPayoutCredits,
      artistPercentage: payoutSettings.artistPercentage,
      holdingPeriodDays: payoutSettings.holdingPeriodDays,
      creditValueUsd: payoutSettings.creditValueUSD,
    };

    return NextResponse.json({
      stats: {
        ...stats,
        availableBalance: adjustedAvailableBalance,
        totalPaidOut,
        pendingPayouts,
      },
      earnings,
      monthlyEarnings,
      payoutHistory,
      payoutConfig,
      stripeConnectStatus: connectAccount
        ? {
            connected: true,
            payoutsEnabled: connectAccount.payoutsEnabled,
            detailsSubmitted: connectAccount.detailsSubmitted,
            externalAccountLast4: connectAccount.externalAccountLast4,
          }
        : { connected: false },
    });
  } catch (error) {
    logger.error({ error }, "Payout data fetch error");
    return NextResponse.json(
      { error: "Failed to fetch payout data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/freelancer/payouts
 * Request a payout
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { creditsAmount } = body;

    // Get payout settings from database
    const payoutSettings = await getPayoutSettings();

    if (!creditsAmount || creditsAmount < payoutSettings.minimumPayoutCredits) {
      return NextResponse.json(
        { error: `Minimum payout is ${payoutSettings.minimumPayoutCredits} credits` },
        { status: 400 }
      );
    }

    // Check Stripe Connect account
    const connectAccount = await getConnectAccount(userId);
    if (!connectAccount) {
      return NextResponse.json(
        { error: "Please connect your Stripe account first" },
        { status: 400 }
      );
    }

    if (!connectAccount.payoutsEnabled) {
      return NextResponse.json(
        { error: "Please complete Stripe onboarding to enable payouts" },
        { status: 400 }
      );
    }

    // Calculate available balance using settings from database
    const holdingPeriodDays = payoutSettings.holdingPeriodDays;
    const availableCutoff = new Date();
    availableCutoff.setDate(availableCutoff.getDate() - holdingPeriodDays);

    const availableResult = await db
      .select({
        total: sum(tasks.creditsUsed),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.freelancerId, userId),
          eq(tasks.status, "COMPLETED"),
          lt(tasks.completedAt, availableCutoff)
        )
      );

    // Get already paid out
    const paidOutResult = await db
      .select({
        total: sum(payouts.creditsAmount),
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.freelancerId, userId),
          sql`${payouts.status} IN ('COMPLETED', 'PENDING', 'PROCESSING')`
        )
      );

    const totalEarned = Number(availableResult[0]?.total) || 0;
    const totalPaidOrPending = Number(paidOutResult[0]?.total) || 0;
    const actualAvailable = totalEarned - totalPaidOrPending;

    if (creditsAmount > actualAvailable) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${actualAvailable} credits` },
        { status: 400 }
      );
    }

    // Calculate payout amounts
    const amounts = calculatePayoutAmounts(creditsAmount);

    // Create payout request
    const result = await createPayoutRequest(
      userId,
      creditsAmount,
      connectAccount.stripeAccountId
    );

    // Process the transfer immediately (or you could queue this for manual review)
    const transferResult = await processPayoutTransfer(result.payoutId);

    if (!transferResult.success) {
      return NextResponse.json(
        { error: transferResult.error || "Payout processing failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payoutId: result.payoutId,
      creditsAmount,
      netAmountUsd: amounts.netAmountUsd,
      transferId: transferResult.transferId,
    });
  } catch (error) {
    logger.error({ error }, "Payout request error");
    return NextResponse.json(
      { error: "Failed to process payout request" },
      { status: 500 }
    );
  }
}
