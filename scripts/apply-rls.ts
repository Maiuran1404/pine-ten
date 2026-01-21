import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

/**
 * Script to enable Row Level Security (RLS) on all tables in the Supabase database.
 *
 * RLS is a security feature that restricts which rows users can access.
 * When enabled without policies, no rows are accessible via the anon/authenticated roles.
 * The service_role (used by the backend) bypasses RLS automatically.
 *
 * Run with: pnpm tsx scripts/apply-rls.ts
 */
async function applyRLS() {
  const postgres = (await import("postgres")).default;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Connecting to database...");
  const sql = postgres(connectionString, {
    ssl: "require",
    max: 1,
  });

  // All tables that need RLS enabled
  const tables = [
    // Auth-related tables (managed by BetterAuth)
    "users",
    "sessions",
    "accounts",
    "verifications",
    // Business tables
    "companies",
    "freelancer_profiles",
    "tasks",
    "task_files",
    "task_messages",
    "task_categories",
    "chat_drafts",
    // Reference and settings tables
    "style_references",
    "platform_settings",
    // Transaction and notification tables
    "credit_transactions",
    "notifications",
    // Template and design tables
    "generated_designs",
    "orshot_templates",
    "brand_references",
    "deliverable_style_references",
    "style_selection_history",
    // Webhook events (system table)
    "webhook_events",
    // Notification settings (admin table)
    "notification_settings",
    // Security testing tables
    "test_users",
    "test_schedules",
    "security_tests",
    "security_test_runs",
    "security_test_results",
    "security_snapshots",
    // Audit logging table
    "audit_logs",
    // Task activity and import tracking
    "task_activity_log",
    "import_logs",
  ];

  try {
    console.log("\n1. Enabling RLS on all tables...\n");

    for (const table of tables) {
      try {
        await sql.unsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
        console.log(`✓ Enabled RLS on: ${table}`);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.log(`⚠ ${table}: ${err.message}`);
      }
    }

    console.log("\n2. Creating service_role policies...\n");

    for (const table of tables) {
      const policyName = `service_role_${table}`;
      try {
        await sql.unsafe(`
          CREATE POLICY "${policyName}" ON "${table}"
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true)
        `);
        console.log(`✓ Created policy: ${policyName}`);
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err.code === "42710" || err.message?.includes("already exists")) {
          console.log(`⚠ Policy exists: ${policyName}`);
        } else {
          console.log(`✗ Error for ${policyName}: ${err.message}`);
        }
      }
    }

    console.log("\n3. Creating authenticated user policies...\n");

    // Policies for public read access to reference tables
    const publicReadPolicies = [
      { table: "orshot_templates", condition: "is_active = true" },
      { table: "brand_references", condition: "is_active = true" },
      { table: "deliverable_style_references", condition: "is_active = true" },
    ];

    for (const { table, condition } of publicReadPolicies) {
      const policyName = `authenticated_read_${table}`;
      try {
        await sql.unsafe(`
          CREATE POLICY "${policyName}" ON "${table}"
            FOR SELECT
            TO authenticated
            USING (${condition})
        `);
        console.log(`✓ Created policy: ${policyName}`);
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err.code === "42710" || err.message?.includes("already exists")) {
          console.log(`⚠ Policy exists: ${policyName}`);
        } else {
          console.log(`✗ Error for ${policyName}: ${err.message}`);
        }
      }
    }

    // User-specific read policies
    const userReadPolicies = [
      { table: "generated_designs", userColumn: "client_id" },
      { table: "style_selection_history", userColumn: "user_id" },
    ];

    for (const { table, userColumn } of userReadPolicies) {
      const policyName = `users_read_own_${table}`;
      try {
        await sql.unsafe(`
          CREATE POLICY "${policyName}" ON "${table}"
            FOR SELECT
            TO authenticated
            USING (${userColumn} = auth.uid()::text)
        `);
        console.log(`✓ Created policy: ${policyName}`);
      } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        if (err.code === "42710" || err.message?.includes("already exists")) {
          console.log(`⚠ Policy exists: ${policyName}`);
        } else {
          console.log(`✗ Error for ${policyName}: ${err.message}`);
        }
      }
    }

    console.log("\n4. Verifying RLS status...\n");

    const result = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = ANY(${tables})
      ORDER BY tablename
    `;

    let allEnabled = true;
    for (const row of result) {
      const status = row.rowsecurity ? "✓ ENABLED" : "✗ DISABLED";
      if (!row.rowsecurity) allEnabled = false;
      console.log(`${row.tablename.padEnd(25)} ${status}`);
    }

    if (allEnabled) {
      console.log("\n✓ All tables have RLS enabled!");
    } else {
      console.log("\n⚠ Some tables still have RLS disabled.");
    }
  } finally {
    await sql.end();
  }
}

applyRLS()
  .catch((error) => {
    console.error("\n✗ Migration failed:", error);
    process.exit(1);
  });
