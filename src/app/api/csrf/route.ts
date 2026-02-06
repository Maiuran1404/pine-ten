import { NextResponse } from "next/server";
import { setCsrfCookie } from "@/lib/csrf";
import { logger } from "@/lib/logger";

/**
 * GET /api/csrf
 * Returns a new CSRF token and sets it in an httpOnly cookie
 * Call this on app initialization to get a token for subsequent requests
 */
export async function GET() {
  try {
    const token = await setCsrfCookie();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    logger.error({ error }, "Failed to generate CSRF token");
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
