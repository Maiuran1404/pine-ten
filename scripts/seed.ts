import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function seed() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import("../src/db");
  const { taskCategories, styleReferences, platformSettings, users, securityTests } = await import("../src/db/schema");
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

  // Seed security tests
  console.log("Seeding security tests...");
  const securityTestData = [
    // Authentication Tests
    {
      name: "Login with valid credentials",
      description: "Verify that users can log in with valid email and password",
      category: "auth",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "User should be redirected to dashboard after successful login",
    },
    {
      name: "Login with invalid credentials",
      description: "Verify that login fails with incorrect password and shows appropriate error",
      category: "auth",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Should display error message without revealing if email exists",
    },
    {
      name: "Login rate limiting",
      description: "Test that multiple failed login attempts trigger rate limiting",
      category: "auth",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "After 5 failed attempts, should show rate limit message",
    },
    {
      name: "Session timeout",
      description: "Verify that inactive sessions expire after the configured timeout",
      category: "auth",
      testType: "deterministic",
      severity: "medium",
      expectedOutcome: "Session should expire and redirect to login",
    },
    {
      name: "Logout functionality",
      description: "Verify that logout properly clears session and cookies",
      category: "auth",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Session cookie should be cleared, back button should not restore session",
    },
    {
      name: "Password reset flow",
      description: "Test the complete password reset flow from request to completion",
      category: "auth",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "User should receive reset email and be able to set new password",
    },

    // Authorization Tests
    {
      name: "Admin page access control",
      description: "Verify that non-admin users cannot access admin routes",
      category: "authz",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Non-admin users should be redirected or shown 403 error",
    },
    {
      name: "User can only access own data",
      description: "Test that users cannot access other users' data by manipulating IDs",
      category: "authz",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Accessing other user data should return 403 or 404",
    },
    {
      name: "Role-based feature access",
      description: "Verify that features are properly restricted based on user roles",
      category: "authz",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Features should only be visible/accessible to authorized roles",
    },
    {
      name: "API endpoint authorization",
      description: "Test that API endpoints enforce proper authorization checks",
      category: "authz",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Unauthorized API calls should return 401 or 403",
    },

    // Input Validation & XSS Tests
    {
      name: "XSS in text inputs",
      description: "Test that script injection is properly sanitized in all text inputs",
      category: "forms",
      testType: "exploratory",
      severity: "critical",
      exploratoryConfig: {
        targetAreas: ["input fields", "text areas", "search boxes"],
        testPayloads: ["<script>alert(1)</script>", "<img onerror=alert(1) src=x>", "javascript:alert(1)"],
      },
      expectedOutcome: "All script payloads should be sanitized or escaped",
    },
    {
      name: "SQL injection prevention",
      description: "Test that SQL injection attempts are blocked",
      category: "forms",
      testType: "exploratory",
      severity: "critical",
      exploratoryConfig: {
        targetAreas: ["search", "filters", "ID parameters"],
        testPayloads: ["' OR '1'='1", "1; DROP TABLE users--", "UNION SELECT * FROM users"],
      },
      expectedOutcome: "SQL payloads should not affect database queries",
    },
    {
      name: "Form CSRF protection",
      description: "Verify that forms are protected against cross-site request forgery",
      category: "forms",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Forms without valid CSRF tokens should be rejected",
    },
    {
      name: "File upload validation",
      description: "Test that file uploads validate type, size, and content",
      category: "forms",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Malicious files and oversized uploads should be rejected",
    },
    {
      name: "Input length limits",
      description: "Verify that excessively long inputs are rejected",
      category: "forms",
      testType: "deterministic",
      severity: "medium",
      expectedOutcome: "Inputs exceeding limits should be truncated or rejected",
    },

    // API Security Tests
    {
      name: "API authentication required",
      description: "Test that all API endpoints require authentication",
      category: "api",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Unauthenticated requests should return 401",
    },
    {
      name: "API rate limiting",
      description: "Verify that API endpoints are protected by rate limiting",
      category: "api",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Excessive requests should return 429 Too Many Requests",
    },
    {
      name: "Sensitive data in API responses",
      description: "Check that API responses don't leak sensitive data like passwords or tokens",
      category: "api",
      testType: "exploratory",
      severity: "critical",
      expectedOutcome: "No passwords, tokens, or internal IDs in responses",
    },
    {
      name: "API error handling",
      description: "Verify that API errors don't expose stack traces or internal details",
      category: "api",
      testType: "deterministic",
      severity: "medium",
      expectedOutcome: "Errors should return generic messages, not stack traces",
    },

    // Session Security Tests
    {
      name: "Session fixation prevention",
      description: "Test that session ID is regenerated after login",
      category: "session",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Session ID should change after successful authentication",
    },
    {
      name: "Secure cookie flags",
      description: "Verify that session cookies have Secure, HttpOnly, and SameSite flags",
      category: "session",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Cookies should have all security flags set",
    },
    {
      name: "Concurrent session handling",
      description: "Test behavior when user logs in from multiple devices",
      category: "session",
      testType: "deterministic",
      severity: "medium",
      expectedOutcome: "Should either allow or explicitly handle multiple sessions",
    },

    // Navigation & URL Security Tests
    {
      name: "Direct URL access control",
      description: "Test that protected pages cannot be accessed by direct URL entry",
      category: "navigation",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Direct access to protected URLs should redirect to login",
    },
    {
      name: "Open redirect prevention",
      description: "Test that redirect parameters cannot be abused for phishing",
      category: "navigation",
      testType: "exploratory",
      severity: "high",
      exploratoryConfig: {
        targetAreas: ["redirect parameters", "return URLs", "callback URLs"],
        testPayloads: ["//evil.com", "https://evil.com", "/\\evil.com"],
      },
      expectedOutcome: "Redirects to external domains should be blocked",
    },
    {
      name: "Path traversal prevention",
      description: "Test that file/path parameters cannot traverse directories",
      category: "navigation",
      testType: "exploratory",
      severity: "critical",
      exploratoryConfig: {
        targetAreas: ["file parameters", "path parameters"],
        testPayloads: ["../../../etc/passwd", "..\\..\\..\\windows\\system32"],
      },
      expectedOutcome: "Path traversal attempts should be blocked",
    },

    // Data Protection Tests
    {
      name: "IDOR vulnerability check",
      description: "Test for Insecure Direct Object References by manipulating resource IDs",
      category: "data",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Accessing resources with other users' IDs should fail",
    },
    {
      name: "Sensitive data encryption",
      description: "Verify that sensitive data is encrypted at rest and in transit",
      category: "data",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Passwords should be hashed, sensitive data encrypted",
    },
    {
      name: "Data export authorization",
      description: "Test that data export features enforce proper authorization",
      category: "data",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Users should only export their own data",
    },
    {
      name: "PII data masking",
      description: "Verify that PII is masked in logs and non-essential displays",
      category: "data",
      testType: "exploratory",
      severity: "medium",
      expectedOutcome: "Emails, phone numbers, etc. should be partially masked",
    },

    // Payment Security Tests
    {
      name: "Payment amount tampering",
      description: "Test that payment amounts cannot be manipulated client-side",
      category: "payment",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Server should validate amounts against expected values",
    },
    {
      name: "Payment double-submit prevention",
      description: "Verify that payments cannot be submitted multiple times",
      category: "payment",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Duplicate payment attempts should be rejected",
    },
    {
      name: "Payment webhook validation",
      description: "Test that payment webhooks validate signatures properly",
      category: "payment",
      testType: "deterministic",
      severity: "critical",
      expectedOutcome: "Unsigned or tampered webhooks should be rejected",
    },

    // Security Headers Tests
    {
      name: "Security headers present",
      description: "Verify that essential security headers are set",
      category: "headers",
      testType: "deterministic",
      severity: "medium",
      expectedOutcome: "X-Frame-Options, X-Content-Type-Options, CSP should be present",
    },
    {
      name: "CORS configuration",
      description: "Test that CORS is properly configured to prevent unauthorized access",
      category: "headers",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Only allowed origins should be able to make requests",
    },
    {
      name: "Content Security Policy",
      description: "Verify CSP prevents loading of unauthorized scripts",
      category: "headers",
      testType: "deterministic",
      severity: "high",
      expectedOutcome: "Inline scripts and unauthorized sources should be blocked",
    },
  ];

  for (const test of securityTestData) {
    await db
      .insert(securityTests)
      .values(test)
      .onConflictDoNothing();
  }
  console.log(`✓ Seeded ${securityTestData.length} security tests`);

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
