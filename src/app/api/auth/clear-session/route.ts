import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force clear all auth-related cookies
// This is useful when session state becomes corrupted
export async function POST() {
  const cookieStore = await cookies();

  // Clear all cookies with the "pine" prefix (BetterAuth cookie prefix)
  const allCookies = cookieStore.getAll();

  for (const cookie of allCookies) {
    if (cookie.name.startsWith("pine")) {
      cookieStore.delete(cookie.name);
    }
  }

  // Also try to clear common auth cookie names
  const authCookieNames = [
    "pine.session_token",
    "pine.session",
    "pine_session_token",
    "pine_session",
    "better-auth.session_token",
    "better-auth.session",
  ];

  for (const name of authCookieNames) {
    try {
      cookieStore.delete(name);
    } catch {
      // Cookie might not exist
    }
  }

  return NextResponse.json({ success: true, message: "Session cleared" });
}

export async function GET() {
  // Allow GET request to clear session for easy browser access
  const cookieStore = await cookies();

  const allCookies = cookieStore.getAll();
  const clearedCookies: string[] = [];

  for (const cookie of allCookies) {
    if (cookie.name.startsWith("pine") || cookie.name.includes("session") || cookie.name.includes("auth")) {
      cookieStore.delete(cookie.name);
      clearedCookies.push(cookie.name);
    }
  }

  // Redirect to login after clearing
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
