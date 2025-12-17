import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { users, tasks, creditTransactions } from "@/db/schema";
import { eq, desc, count, sum, sql } from "drizzle-orm";

export async function GET() {
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

    // Get all clients with their stats
    const clients = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        credits: users.credits,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "CLIENT"))
      .orderBy(desc(users.createdAt));

    // Get task counts for each client
    const taskCounts = await db
      .select({
        clientId: tasks.clientId,
        totalTasks: count(),
        completedTasks: sql<number>`count(*) filter (where ${tasks.status} = 'COMPLETED')`,
      })
      .from(tasks)
      .groupBy(tasks.clientId);

    // Get total credits purchased for each client
    const creditsPurchased = await db
      .select({
        userId: creditTransactions.userId,
        totalPurchased: sum(creditTransactions.amount),
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.type, "PURCHASE"))
      .groupBy(creditTransactions.userId);

    // Combine data
    const clientsWithStats = clients.map((client) => {
      const taskCount = taskCounts.find((tc) => tc.clientId === client.id);
      const credits = creditsPurchased.find((cp) => cp.userId === client.id);

      return {
        ...client,
        totalTasks: taskCount?.totalTasks || 0,
        completedTasks: taskCount?.completedTasks || 0,
        totalCreditsPurchased: credits?.totalPurchased ? Number(credits.totalPurchased) : 0,
      };
    });

    return NextResponse.json({ clients: clientsWithStats });
  } catch (error) {
    console.error("Admin clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
