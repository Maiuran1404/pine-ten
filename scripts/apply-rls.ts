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
    "users",
    "sessions",
    "accounts",
    "verifications",
    "companies",
    "freelancer_profiles",
    "tasks",
    "task_files",
    "task_messages",
    "task_categories",
    "chat_drafts",
    "style_references",
    "platform_settings",
    "credit_transactions",
    "notifications",
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

    console.log("\n3. Verifying RLS status...\n");

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
