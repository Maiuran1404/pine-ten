import { db } from "../src/db";
import {
  taskCategories,
  styleReferences,
  platformSettings,
  users,
} from "../src/db/schema";
import { defaultTaskCategories, styleReferenceCategories } from "../src/lib/config";

async function seed() {
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

  // Create a default admin user (for development)
  console.log("Creating admin user...");
  const adminId = "admin-" + Date.now();
  await db
    .insert(users)
    .values({
      id: adminId,
      name: "Admin User",
      email: "admin@nameless.local",
      emailVerified: true,
      role: "ADMIN",
      onboardingCompleted: true,
      credits: 100,
    })
    .onConflictDoNothing();

  console.log("Seed completed successfully!");
  console.log("\nDefault admin account:");
  console.log("  Email: admin@nameless.local");
  console.log("  (Create password via the registration flow or reset)");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
