import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function seed() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("../src/db");
  const { taskCategories, styleReferences, platformSettings, users } = await import("../src/db/schema");
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

  // Seed style references with Unsplash images
  console.log("Seeding style references...");
  const styleData = [
    // Minimalist
    { category: "Minimalist", name: "Clean White Space", imageUrl: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=225&fit=crop", tags: ["minimalist", "clean", "white"] },
    { category: "Minimalist", name: "Simple Lines", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop", tags: ["minimalist", "simple", "lines"] },
    { category: "Minimalist", name: "Neutral Tones", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=225&fit=crop", tags: ["minimalist", "neutral", "calm"] },
    // Bold & Colorful
    { category: "Bold & Colorful", name: "Vibrant Gradients", imageUrl: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=225&fit=crop", tags: ["bold", "gradient", "vibrant"] },
    { category: "Bold & Colorful", name: "Neon Pop", imageUrl: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400&h=225&fit=crop", tags: ["bold", "neon", "pop"] },
    { category: "Bold & Colorful", name: "Color Splash", imageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=225&fit=crop", tags: ["bold", "colorful", "splash"] },
    // Corporate & Professional
    { category: "Corporate & Professional", name: "Executive Blue", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=225&fit=crop", tags: ["corporate", "professional", "blue"] },
    { category: "Corporate & Professional", name: "Business Modern", imageUrl: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400&h=225&fit=crop", tags: ["corporate", "business", "modern"] },
    { category: "Corporate & Professional", name: "Office Clean", imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=225&fit=crop", tags: ["corporate", "office", "clean"] },
    // Playful & Fun
    { category: "Playful & Fun", name: "Bright & Happy", imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=225&fit=crop", tags: ["playful", "fun", "bright"] },
    { category: "Playful & Fun", name: "Colorful Confetti", imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=225&fit=crop", tags: ["playful", "confetti", "party"] },
    { category: "Playful & Fun", name: "Cartoon Style", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop", tags: ["playful", "fun", "creative"] },
    // Elegant & Luxury
    { category: "Elegant & Luxury", name: "Gold Accents", imageUrl: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&h=225&fit=crop", tags: ["elegant", "luxury", "gold"] },
    { category: "Elegant & Luxury", name: "Dark Sophistication", imageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400&h=225&fit=crop", tags: ["elegant", "dark", "sophisticated"] },
    { category: "Elegant & Luxury", name: "Marble Premium", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=225&fit=crop", tags: ["elegant", "marble", "premium"] },
    // Modern & Clean
    { category: "Modern & Clean", name: "Geometric Modern", imageUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=225&fit=crop", tags: ["modern", "geometric", "clean"] },
    { category: "Modern & Clean", name: "Sleek Design", imageUrl: "https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=225&fit=crop", tags: ["modern", "sleek", "contemporary"] },
    { category: "Modern & Clean", name: "Fresh Layout", imageUrl: "https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=400&h=225&fit=crop", tags: ["modern", "fresh", "layout"] },
    // Retro & Vintage
    { category: "Retro & Vintage", name: "70s Vibes", imageUrl: "https://images.unsplash.com/photo-1558051815-0f18e64e6280?w=400&h=225&fit=crop", tags: ["retro", "vintage", "70s"] },
    { category: "Retro & Vintage", name: "Film Grain", imageUrl: "https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?w=400&h=225&fit=crop", tags: ["retro", "film", "nostalgic"] },
    { category: "Retro & Vintage", name: "Classic Poster", imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=225&fit=crop", tags: ["retro", "classic", "poster"] },
    // Tech & Futuristic
    { category: "Tech & Futuristic", name: "Cyber Neon", imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=225&fit=crop", tags: ["tech", "cyber", "neon"] },
    { category: "Tech & Futuristic", name: "Digital Grid", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop", tags: ["tech", "digital", "futuristic"] },
    { category: "Tech & Futuristic", name: "AI Abstract", imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=225&fit=crop", tags: ["tech", "ai", "abstract"] },
  ];

  for (const style of styleData) {
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

  // Create admin user
  console.log("Creating admin user...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!adminEmail || !adminPassword) {
    console.log("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set in environment");
    console.log("   Skipping admin user creation");
    console.log("   Set these in .env to create admin user");
  } else {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`✓ Admin user already exists: ${adminEmail}`);

      // Update to ensure ADMIN role and settings
      await db
        .update(users)
        .set({
          role: "ADMIN",
          onboardingCompleted: true,
          credits: 1000,
        })
        .where(eq(users.email, adminEmail));
      console.log("✓ Ensured admin role and settings are set");
    } else {
      // Create admin via Better Auth API (ensures correct password hashing)
      console.log("Creating admin via Better Auth API...");

      try {
        const signupResponse = await fetch(`${appUrl}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            name: "Super Admin",
          }),
        });

        if (!signupResponse.ok) {
          const error = await signupResponse.text();
          throw new Error(`Signup failed: ${error}`);
        }

        // Update the user role to ADMIN
        await db
          .update(users)
          .set({
            role: "ADMIN",
            onboardingCompleted: true,
            credits: 1000,
            emailVerified: true,
          })
          .where(eq(users.email, adminEmail));

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
      } catch (error) {
        console.error("Failed to create admin via API:", error);
        console.log("");
        console.log("To create admin manually:");
        console.log("1. Start the dev server: pnpm dev");
        console.log("2. Run this seed script again: pnpm db:seed");
        console.log("   OR");
        console.log("1. Register at /register with the admin email");
        console.log("2. Update role in database: UPDATE users SET role = 'ADMIN' WHERE email = '" + adminEmail + "';");
      }
    }
  }

  console.log("\nSeed completed successfully!");
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
