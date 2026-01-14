import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { securityTests } from "@/db/schema";

// Default security tests to seed
const defaultTests = [
  // Authentication Tests
  {
    name: "Login page loads correctly",
    description: "Verify the login page renders without errors and contains expected elements",
    category: "auth",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "navigate", target: "/login" },
        { action: "waitFor", target: "form", timeout: 5000 },
        { action: "assertVisible", target: "email input" },
        { action: "assertVisible", target: "password input" },
        { action: "assertVisible", target: "submit button" },
      ],
    },
    expectedOutcome: "Login form is visible with all required fields",
  },
  {
    name: "Login with invalid credentials shows error",
    description: "Verify that invalid login attempts are properly rejected",
    category: "auth",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "navigate", target: "/login" },
        { action: "fill", target: "email input", value: "invalid@test.com" },
        { action: "fill", target: "password input", value: "wrongpassword" },
        { action: "click", target: "submit button" },
        { action: "waitFor", target: "error message", timeout: 5000 },
        { action: "assertVisible", target: "error message" },
      ],
    },
    expectedOutcome: "Error message is displayed for invalid credentials",
  },
  {
    name: "Protected routes redirect to login",
    description: "Verify unauthenticated users are redirected to login when accessing protected routes",
    category: "auth",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "navigate", target: "/dashboard" },
        { action: "waitFor", target: "login page", timeout: 5000 },
        { action: "assertUrl", value: "/login" },
      ],
    },
    expectedOutcome: "User is redirected to login page",
  },
  {
    name: "Logout clears session",
    description: "Verify logout properly clears user session and redirects",
    category: "auth",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "login", target: "test user" },
        { action: "navigate", target: "/dashboard" },
        { action: "click", target: "logout button" },
        { action: "waitFor", target: "login page", timeout: 5000 },
        { action: "navigate", target: "/dashboard" },
        { action: "assertUrl", value: "/login" },
      ],
    },
    expectedOutcome: "User is logged out and cannot access protected routes",
  },

  // Navigation Tests
  {
    name: "Main navigation links work",
    description: "Verify all main navigation links lead to valid pages",
    category: "navigation",
    testType: "exploratory",
    severity: "medium",
    exploratoryConfig: {
      startUrl: "/",
      maxDepth: 2,
      patterns: ["nav a", "header a"],
      checkTypes: ["links", "status"],
    },
    expectedOutcome: "All navigation links return 200 status",
  },
  {
    name: "No broken links on homepage",
    description: "Check for 404 errors on all links from homepage",
    category: "navigation",
    testType: "exploratory",
    severity: "medium",
    exploratoryConfig: {
      startUrl: "/",
      maxDepth: 1,
      checkTypes: ["links"],
    },
    expectedOutcome: "No broken links found",
  },

  // Form Tests
  {
    name: "Contact form validation",
    description: "Verify form validation for required fields",
    category: "forms",
    testType: "deterministic",
    severity: "medium",
    testFlow: {
      steps: [
        { action: "navigate", target: "/contact" },
        { action: "click", target: "submit button" },
        { action: "assertVisible", target: "validation error" },
      ],
    },
    expectedOutcome: "Validation errors shown for empty required fields",
  },
  {
    name: "Form XSS prevention",
    description: "Verify forms sanitize input to prevent XSS attacks",
    category: "forms",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "navigate", target: "/contact" },
        { action: "fill", target: "name input", value: "<script>alert('xss')</script>" },
        { action: "fill", target: "message input", value: "<img onerror='alert(1)' src='x'>" },
        { action: "click", target: "submit button" },
        { action: "assertNoAlert" },
        { action: "assertNoScript" },
      ],
    },
    expectedOutcome: "XSS payloads are sanitized and not executed",
  },

  // API Tests
  {
    name: "API authentication required",
    description: "Verify API endpoints require authentication",
    category: "api",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "apiCall", target: "/api/tasks", value: "GET" },
        { action: "assertStatus", value: "401" },
      ],
    },
    expectedOutcome: "Unauthenticated API calls return 401",
  },
  {
    name: "API rate limiting active",
    description: "Verify rate limiting prevents abuse",
    category: "api",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "loop", value: "100" },
        { action: "apiCall", target: "/api/health", value: "GET" },
        { action: "assertStatus", value: "429" },
      ],
    },
    expectedOutcome: "Rate limiting kicks in after excessive requests",
  },

  // Permission Tests
  {
    name: "Admin routes protected from regular users",
    description: "Verify non-admin users cannot access admin routes",
    category: "permissions",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "login", target: "client user" },
        { action: "navigate", target: "/admin" },
        { action: "assertNotUrl", value: "/admin" },
      ],
    },
    expectedOutcome: "Non-admin users are redirected from admin routes",
  },
  {
    name: "Users can only view own data",
    description: "Verify users cannot access other users' data",
    category: "permissions",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "login", target: "user A" },
        { action: "apiCall", target: "/api/tasks/user-b-task-id", value: "GET" },
        { action: "assertStatus", value: "403" },
      ],
    },
    expectedOutcome: "403 returned when accessing other user's data",
  },

  // Data Integrity Tests
  {
    name: "Form data persists correctly",
    description: "Verify submitted form data is stored and retrieved correctly",
    category: "data",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "login", target: "test user" },
        { action: "navigate", target: "/new-task" },
        { action: "fill", target: "title", value: "Test Task 12345" },
        { action: "click", target: "submit" },
        { action: "waitFor", target: "success", timeout: 5000 },
        { action: "navigate", target: "/tasks" },
        { action: "assertText", value: "Test Task 12345" },
      ],
    },
    expectedOutcome: "Submitted data appears correctly in list",
  },

  // Payment Tests
  {
    name: "Payment flow loads Stripe",
    description: "Verify payment integration loads correctly",
    category: "payment",
    testType: "deterministic",
    severity: "critical",
    testFlow: {
      steps: [
        { action: "login", target: "test user" },
        { action: "navigate", target: "/checkout" },
        { action: "waitFor", target: "stripe iframe", timeout: 10000 },
        { action: "assertVisible", target: "stripe card element" },
      ],
    },
    expectedOutcome: "Stripe payment form loads correctly",
  },
  {
    name: "Invalid payment shows error",
    description: "Verify payment errors are handled gracefully",
    category: "payment",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "login", target: "test user" },
        { action: "navigate", target: "/checkout" },
        { action: "fillStripe", target: "card number", value: "4000000000000002" },
        { action: "click", target: "pay button" },
        { action: "waitFor", target: "error message", timeout: 10000 },
        { action: "assertVisible", target: "payment declined message" },
      ],
    },
    expectedOutcome: "Payment decline is shown to user",
  },

  // Exploratory Security Scan
  {
    name: "Full site security scan",
    description: "Crawl entire site looking for security issues",
    category: "security",
    testType: "exploratory",
    severity: "high",
    exploratoryConfig: {
      startUrl: "/",
      maxDepth: 5,
      excludePatterns: ["/logout", "/api/*"],
      checkTypes: ["links", "forms", "headers", "console"],
    },
    expectedOutcome: "No security vulnerabilities detected",
  },
  {
    name: "Check security headers",
    description: "Verify proper security headers are set",
    category: "security",
    testType: "deterministic",
    severity: "high",
    testFlow: {
      steps: [
        { action: "navigate", target: "/" },
        { action: "checkHeader", target: "X-Frame-Options" },
        { action: "checkHeader", target: "X-Content-Type-Options" },
        { action: "checkHeader", target: "Strict-Transport-Security" },
        { action: "checkHeader", target: "Content-Security-Policy" },
      ],
    },
    expectedOutcome: "All security headers are properly configured",
  },
];

// POST - Seed default security tests
export async function POST() {
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

    // Insert all default tests
    const inserted = await db
      .insert(securityTests)
      .values(defaultTests)
      .returning();

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted.length} security tests`,
      tests: inserted,
    });
  } catch (error) {
    console.error("Failed to seed security tests:", error);
    return NextResponse.json(
      { error: "Failed to seed tests" },
      { status: 500 }
    );
  }
}
