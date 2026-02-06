import { db } from "@/db";
import { users, creditTransactions, webhookEvents } from "@/db/schema";
import { eq, desc, sum, count, sql, and, gte, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/require-auth";
import { withErrorHandling, successResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { getCreditSettings } from "@/lib/platform-settings";

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    await requireAdmin();

    // Get credit settings from database
    const creditSettings = await getCreditSettings();
    const pricePerCredit = creditSettings.pricePerCredit;
    const currency = creditSettings.currency;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, month, week, year

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date | null = null;

    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Helper for safe queries
    const safeQuery = async <T>(name: string, query: Promise<T>, defaultValue: T): Promise<T> => {
      try {
        return await query;
      } catch (err) {
        logger.error({ err, queryName: name }, `Failed to query ${name}`);
        return defaultValue;
      }
    };

    // Get total revenue from purchases
    const purchaseCondition = startDate
      ? and(eq(creditTransactions.type, "PURCHASE"), gte(creditTransactions.createdAt, startDate))
      : eq(creditTransactions.type, "PURCHASE");

    const totalCreditsResult = await safeQuery(
      "totalCredits",
      db.select({ total: sum(creditTransactions.amount) })
        .from(creditTransactions)
        .where(purchaseCondition),
      [{ total: "0" }]
    );
    const totalCreditsPurchased = Number(totalCreditsResult[0]?.total) || 0;
    const totalRevenue = totalCreditsPurchased * pricePerCredit;

    // Get transaction counts by type
    const transactionsByType = await safeQuery(
      "transactionsByType",
      db.select({
        type: creditTransactions.type,
        count: count(),
        totalAmount: sum(creditTransactions.amount),
      })
        .from(creditTransactions)
        .groupBy(creditTransactions.type),
      []
    );

    // Get recent transactions with user info
    const recentTransactionsQuery = startDate
      ? and(eq(creditTransactions.type, "PURCHASE"), gte(creditTransactions.createdAt, startDate))
      : eq(creditTransactions.type, "PURCHASE");

    const recentTransactions = await safeQuery(
      "recentTransactions",
      db.select({
        id: creditTransactions.id,
        userId: creditTransactions.userId,
        amount: creditTransactions.amount,
        type: creditTransactions.type,
        description: creditTransactions.description,
        stripePaymentId: creditTransactions.stripePaymentId,
        createdAt: creditTransactions.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
        .from(creditTransactions)
        .leftJoin(users, eq(creditTransactions.userId, users.id))
        .where(recentTransactionsQuery)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(50),
      []
    );

    // Get monthly revenue breakdown (last 12 months)
    const monthlyRevenue = await safeQuery(
      "monthlyRevenue",
      db.select({
        month: sql<string>`TO_CHAR(${creditTransactions.createdAt}, 'YYYY-MM')`,
        credits: sum(creditTransactions.amount),
        transactionCount: count(),
      })
        .from(creditTransactions)
        .where(eq(creditTransactions.type, "PURCHASE"))
        .groupBy(sql`TO_CHAR(${creditTransactions.createdAt}, 'YYYY-MM')`)
        .orderBy(desc(sql`TO_CHAR(${creditTransactions.createdAt}, 'YYYY-MM')`))
        .limit(12),
      []
    );

    // Get top customers by revenue
    const topCustomers = await safeQuery(
      "topCustomers",
      db.select({
        userId: creditTransactions.userId,
        userName: users.name,
        userEmail: users.email,
        totalCredits: sum(creditTransactions.amount),
        transactionCount: count(),
      })
        .from(creditTransactions)
        .leftJoin(users, eq(creditTransactions.userId, users.id))
        .where(eq(creditTransactions.type, "PURCHASE"))
        .groupBy(creditTransactions.userId, users.name, users.email)
        .orderBy(desc(sum(creditTransactions.amount)))
        .limit(10),
      []
    );

    // Get credit package distribution (analyze from descriptions/amounts)
    const packageDistribution = await safeQuery(
      "packageDistribution",
      db.select({
        amount: creditTransactions.amount,
        count: count(),
      })
        .from(creditTransactions)
        .where(eq(creditTransactions.type, "PURCHASE"))
        .groupBy(creditTransactions.amount)
        .orderBy(desc(count())),
      []
    );

    // Get webhook events (Stripe events) for debugging
    const webhookEventsData = await safeQuery(
      "webhookEvents",
      db.select({
        id: webhookEvents.id,
        eventId: webhookEvents.eventId,
        eventType: webhookEvents.eventType,
        status: webhookEvents.status,
        processedAt: webhookEvents.processedAt,
        errorMessage: webhookEvents.errorMessage,
      })
        .from(webhookEvents)
        .orderBy(desc(webhookEvents.processedAt))
        .limit(20),
      []
    );

    // Calculate additional metrics
    const purchaseTransactions = transactionsByType.find(t => t.type === "PURCHASE");
    const usageTransactions = transactionsByType.find(t => t.type === "USAGE");
    const bonusTransactions = transactionsByType.find(t => t.type === "BONUS");
    const refundTransactions = transactionsByType.find(t => t.type === "REFUND");

    // Get unique paying customers count
    const uniqueCustomersResult = await safeQuery(
      "uniqueCustomers",
      db.selectDistinct({ userId: creditTransactions.userId })
        .from(creditTransactions)
        .where(eq(creditTransactions.type, "PURCHASE")),
      []
    );

    // Get today's revenue
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayRevenueResult = await safeQuery(
      "todayRevenue",
      db.select({ total: sum(creditTransactions.amount) })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.type, "PURCHASE"),
          gte(creditTransactions.createdAt, todayStart)
        )),
      [{ total: "0" }]
    );

    // Get this week's revenue
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRevenueResult = await safeQuery(
      "weekRevenue",
      db.select({ total: sum(creditTransactions.amount) })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.type, "PURCHASE"),
          gte(creditTransactions.createdAt, weekStart)
        )),
      [{ total: "0" }]
    );

    // Get this month's revenue
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRevenueResult = await safeQuery(
      "monthRevenue",
      db.select({ total: sum(creditTransactions.amount) })
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.type, "PURCHASE"),
          gte(creditTransactions.createdAt, monthStart)
        )),
      [{ total: "0" }]
    );

    // Try to get Stripe balance (with error handling)
    let stripeBalance = null;
    try {
      const stripe = getStripe();
      const balance = await stripe.balance.retrieve();
      stripeBalance = {
        available: balance.available.map(b => ({
          amount: b.amount,
          currency: b.currency,
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount,
          currency: b.currency,
        })),
      };
    } catch (err) {
      logger.warn({ err }, "Failed to fetch Stripe balance");
    }

    // Try to get recent Stripe charges
    let recentCharges: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created: number;
      customerEmail: string | null;
      description: string | null;
      receiptUrl: string | null;
    }> = [];
    try {
      const stripe = getStripe();
      const charges = await stripe.charges.list({
        limit: 20,
      });
      recentCharges = charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        customerEmail: charge.billing_details?.email || null,
        description: charge.description,
        receiptUrl: charge.receipt_url,
      }));
    } catch (err) {
      logger.warn({ err }, "Failed to fetch Stripe charges");
    }

    // Try to get recent Stripe payouts
    let recentPayouts: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      created: number;
      arrivalDate: number;
    }> = [];
    try {
      const stripe = getStripe();
      const payouts = await stripe.payouts.list({
        limit: 10,
      });
      recentPayouts = payouts.data.map(payout => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        created: payout.created,
        arrivalDate: payout.arrival_date,
      }));
    } catch (err) {
      logger.warn({ err }, "Failed to fetch Stripe payouts");
    }

    // Format package distribution with names
    const packageNames: Record<number, string> = {
      5: "5 Credits",
      10: "10 Credits",
      25: "25 Credits",
      50: "50 Credits",
    };

    const formattedPackageDistribution = packageDistribution.map(p => ({
      credits: Number(p.amount),
      packageName: packageNames[Number(p.amount)] || `${p.amount} Credits`,
      count: Number(p.count),
      revenue: Number(p.amount) * Number(p.count) * pricePerCredit,
    }));

    return successResponse({
      overview: {
        totalRevenue,
        totalCreditsPurchased,
        pricePerCredit: pricePerCredit,
        currency: currency,
        uniquePayingCustomers: uniqueCustomersResult.length,
        averageOrderValue: purchaseTransactions
          ? (totalCreditsPurchased / Number(purchaseTransactions.count)) * pricePerCredit
          : 0,
      },
      periodRevenue: {
        today: (Number(todayRevenueResult[0]?.total) || 0) * pricePerCredit,
        thisWeek: (Number(weekRevenueResult[0]?.total) || 0) * pricePerCredit,
        thisMonth: (Number(monthRevenueResult[0]?.total) || 0) * pricePerCredit,
      },
      transactionSummary: {
        purchases: {
          count: Number(purchaseTransactions?.count) || 0,
          totalCredits: Number(purchaseTransactions?.totalAmount) || 0,
          revenue: (Number(purchaseTransactions?.totalAmount) || 0) * pricePerCredit,
        },
        usage: {
          count: Number(usageTransactions?.count) || 0,
          totalCredits: Math.abs(Number(usageTransactions?.totalAmount) || 0),
        },
        bonuses: {
          count: Number(bonusTransactions?.count) || 0,
          totalCredits: Number(bonusTransactions?.totalAmount) || 0,
        },
        refunds: {
          count: Number(refundTransactions?.count) || 0,
          totalCredits: Math.abs(Number(refundTransactions?.totalAmount) || 0),
        },
      },
      monthlyRevenue: monthlyRevenue.map(m => ({
        month: m.month,
        credits: Number(m.credits) || 0,
        revenue: (Number(m.credits) || 0) * pricePerCredit,
        transactionCount: Number(m.transactionCount) || 0,
      })),
      topCustomers: topCustomers.map(c => ({
        userId: c.userId,
        name: c.userName,
        email: c.userEmail,
        totalCredits: Number(c.totalCredits) || 0,
        totalRevenue: (Number(c.totalCredits) || 0) * pricePerCredit,
        transactionCount: Number(c.transactionCount) || 0,
      })),
      packageDistribution: formattedPackageDistribution,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        userId: t.userId,
        userName: t.userName,
        userEmail: t.userEmail,
        credits: t.amount,
        revenue: (t.amount || 0) * pricePerCredit,
        type: t.type,
        description: t.description,
        stripePaymentId: t.stripePaymentId,
        createdAt: t.createdAt,
      })),
      stripe: {
        balance: stripeBalance,
        recentCharges,
        recentPayouts,
      },
      webhookEvents: webhookEventsData,
    });
  }, { endpoint: "GET /api/admin/revenue" });
}
