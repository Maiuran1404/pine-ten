import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function clearAuthTables() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("../src/db");
  const { sessions, verifications, accounts } = await import("../src/db/schema");

  console.log("Clearing auth-related tables...\n");

  try {
    // Clear verifications (OAuth state) - this is the main culprit for state_mismatch
    const deletedVerifications = await db.delete(verifications).returning();
    console.log(`✓ Cleared ${deletedVerifications.length} verifications (OAuth state)`);

    // Clear sessions
    const deletedSessions = await db.delete(sessions).returning();
    console.log(`✓ Cleared ${deletedSessions.length} sessions`);

    // Clear accounts (Google OAuth links)
    const deletedAccounts = await db.delete(accounts).returning();
    console.log(`✓ Cleared ${deletedAccounts.length} accounts (OAuth links)`);

    // Optionally clear users (uncomment if you want full wipe)
    // const deletedUsers = await db.delete(users).returning();
    // console.log(`✓ Cleared ${deletedUsers.length} users`);

    console.log("\n✅ Auth tables cleared successfully!");
    console.log("\nNext steps:");
    console.log("1. Clear your browser cookies for craftedstudio.ai");
    console.log("2. Try signing in again");
    console.log("3. If you wiped users, run: pnpm db:seed");

  } catch (error) {
    console.error("Error clearing auth tables:", error);
    process.exit(1);
  }

  process.exit(0);
}

clearAuthTables();
