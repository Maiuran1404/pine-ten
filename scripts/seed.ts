import * as dotenv from "dotenv";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function seed() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("../src/db");
  const { taskCategories, styleReferences, platformSettings, users, accounts } = await import("../src/db/schema");
  const { defaultTaskCategories, styleReferenceCategories } = await import("../src/lib/config");
  const { eq } = await import("drizzle-orm");

  console.log("Seeding database...");

  // Seed task categories
  console.log("Seeding task categories...");
  for (const category of defaultTaskCategories) {
    await db
      .insert(taskCategories)
      .values({
        name: category.name,
        slug: category.slug,
        description: category.description,
        baseCredits: category.baseCredits,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // Seed style references
  console.log("Seeding style references...");
  const placeholderStyles = styleReferenceCategories.flatMap((category) => [
    {
      category,
      name: `${category} Example 1`,
      imageUrl: `/styles/${category.toLowerCase().replace(/\s+/g, "-")}-1.jpg`,
      tags: [category.toLowerCase(), "example"],
      isActive: true,
    },
    {
      category,
      name: `${category} Example 2`,
      imageUrl: `/styles/${category.toLowerCase().replace(/\s+/g, "-")}-2.jpg`,
      tags: [category.toLowerCase(), "example"],
      isActive: true,
    },
  ]);

  for (const style of placeholderStyles) {
    await db
      .insert(styleReferences)
      .values(style)
      .onConflictDoNothing();
  }

  // Seed platform settings
  console.log("Seeding platform settings...");
  const settings = [
    {
      key: "default_max_revisions",
      value: { value: 2 },
      description: "Default maximum revisions per task",
    },
    {
      key: "credit_price_usd",
      value: { value: 49 },
      description: "Price per credit in USD",
    },
    {
      key: "low_credits_threshold",
      value: { value: 2 },
      description: "Threshold for low credits warning",
    },
    {
      key: "notification_channels",
      value: { email: true, whatsapp: true, inApp: true },
      description: "Enabled notification channels",
    },
  ];

  for (const setting of settings) {
    await db
      .insert(platformSettings)
      .values(setting)
      .onConflictDoNothing();
  }

  // Create admin user with secure password
  console.log("Creating admin user...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in environment");
    console.log("   Skipping admin user creation");
    console.log("   Set these in .env or .env.local to create admin user");
  } else {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`✓ Admin user already exists: ${adminEmail}`);

      // Update to ensure ADMIN role
      await db
        .update(users)
        .set({ role: "ADMIN" })
        .where(eq(users.email, adminEmail));
      console.log("✓ Ensured admin role is set");
    } else {
      // Hash password with bcrypt (same as Better Auth uses)
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      // Generate unique ID
      const adminId = crypto.randomUUID();

      // Create the admin user
      await db.insert(users).values({
        id: adminId,
        name: "Super Admin",
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
        onboardingCompleted: true,
        credits: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create the credential account (for email/password login)
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId: adminId,
        accountId: adminId,
        providerId: "credential",
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("✓ Admin user created successfully!");
      console.log("");
      console.log("╔════════════════════════════════════════════════╗");
      console.log("║           SUPERADMIN CREDENTIALS               ║");
      console.log("╠════════════════════════════════════════════════╣");
      console.log(`║  Email:    ${adminEmail.padEnd(35)}║`);
      console.log(`║  Password: ${adminPassword.padEnd(35)}║`);
      console.log("╠════════════════════════════════════════════════╣");
      console.log("║  Login at: superadmin.craftedstudio.ai/login   ║");
      console.log("╚════════════════════════════════════════════════╝");
      console.log("");
      console.log("⚠️  IMPORTANT: Store these credentials securely!");
      console.log("   Change the password after first login.");
    }
  }

  console.log("\nSeed completed successfully!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
