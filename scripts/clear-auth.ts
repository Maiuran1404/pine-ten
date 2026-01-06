import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function clearAuthTables() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("../src/db");
  const {
    sessions,
    verifications,
    accounts,
    users,
    taskFiles,
    taskMessages,
    tasks,
    notifications,
    creditTransactions,
    freelancerProfiles,
    chatDrafts,
  } = await import("../src/db/schema");

  console.log("=== Complete Database Reset ===\n");
  console.log("This will clear all user data and related records.\n");

  try {
    // Clear in order of dependencies (children first)

    // Task-related
    const deletedTaskFiles = await db.delete(taskFiles).returning();
    console.log(`✓ Cleared ${deletedTaskFiles.length} task files`);

    const deletedTaskMessages = await db.delete(taskMessages).returning();
    console.log(`✓ Cleared ${deletedTaskMessages.length} task messages`);

    // Notifications must be deleted before tasks (FK constraint)
    const deletedNotifications = await db.delete(notifications).returning();
    console.log(`✓ Cleared ${deletedNotifications.length} notifications`);

    // Credit transactions must be deleted before tasks (FK constraint)
    const deletedCreditTransactions = await db.delete(creditTransactions).returning();
    console.log(`✓ Cleared ${deletedCreditTransactions.length} credit transactions`);

    const deletedTasks = await db.delete(tasks).returning();
    console.log(`✓ Cleared ${deletedTasks.length} tasks`);

    // User-related
    const deletedFreelancerProfiles = await db.delete(freelancerProfiles).returning();
    console.log(`✓ Cleared ${deletedFreelancerProfiles.length} freelancer profiles`);

    const deletedChatDrafts = await db.delete(chatDrafts).returning();
    console.log(`✓ Cleared ${deletedChatDrafts.length} chat drafts`);

    // Auth tables
    const deletedVerifications = await db.delete(verifications).returning();
    console.log(`✓ Cleared ${deletedVerifications.length} verifications (OAuth state)`);

    const deletedSessions = await db.delete(sessions).returning();
    console.log(`✓ Cleared ${deletedSessions.length} sessions`);

    const deletedAccounts = await db.delete(accounts).returning();
    console.log(`✓ Cleared ${deletedAccounts.length} accounts (OAuth links)`);

    // Finally, users
    const deletedUsers = await db.delete(users).returning();
    console.log(`✓ Cleared ${deletedUsers.length} users`);

    console.log("\n✅ Database cleared successfully!");
    console.log("\nNext steps:");
    console.log("1. Run: pnpm db:seed (to re-create admin user and seed data)");
    console.log("2. Clear your browser cookies for craftedstudio.ai");
    console.log("3. Deploy to Vercel");
    console.log("\n=== Required Vercel Environment Variables ===");
    console.log("  NEXT_PUBLIC_APP_URL = https://app.craftedstudio.ai");
    console.log("  NEXT_PUBLIC_BASE_DOMAIN = craftedstudio.ai");
    console.log("\n=== Required Google OAuth Console Settings ===");
    console.log("Authorized redirect URI:");
    console.log("  https://app.craftedstudio.ai/api/auth/callback/google");

  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }

  process.exit(0);
}

clearAuthTables();
